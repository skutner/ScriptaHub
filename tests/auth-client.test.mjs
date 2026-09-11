import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptedAccount, CALLBACK_MESSAGE, createAccountClient, matchingCallback, normalizeConfig, readSession, SESSION_KEY, waitForCallback } from '../src/auth-client.js';

const config = normalizeConfig({ issuer: 'http://127.0.0.1:7000/service/oidc', clientId: 'scriptahub-web' }, 'http://127.0.0.1:8000/auth/callback.html');
function storage(value) {
    let saved = JSON.stringify(value);
    return { getItem(key) { assert.equal(key, SESSION_KEY); return saved; }, setItem(key, next) { assert.equal(key, SESSION_KEY); saved = next; }, removeItem(key) { assert.equal(key, SESSION_KEY); saved = null; } };
}
const session = () => ({ issuer: config.issuer, clientId: config.clientId, sub: 'reader-1', accessToken: 'opaque-test-token', expiresAt: Date.now() + 300000 });

test('configuration accepts canonical secure issuer and exact callback, with loopback-only HTTP', () => {
    assert.equal(normalizeConfig({ issuer: 'https://accounts.example.com/service/oidc', clientId: 'scriptahub-web' }, 'https://scriptahub.com/auth/callback.html').callback, 'https://scriptahub.com/auth/callback.html');
    for (const issuer of ['', 'http://accounts.example.com/service/oidc', 'https://user:password@accounts.example.com/service/oidc', 'https://accounts.example.com/service/oidc/', 'https://accounts.example.com/service/oidc?tenant=x', 'https://accounts.example.com/service/oidc#fragment', 'https://accounts.example.com/a/../service/oidc']) {
        assert.throws(() => normalizeConfig({ issuer, clientId: 'scriptahub-web' }, config.callback), { code: 'unavailable' });
    }
    assert.throws(() => normalizeConfig({ issuer: config.issuer, clientId: '*' }, config.callback));
    assert.throws(() => normalizeConfig(config, 'http://scriptahub.com/auth/callback.html'));
});

test('session storage rejects expired, malformed, wrong-provider and wrong-client data', () => {
    assert.equal(readSession(storage(session()), config).sub, 'reader-1');
    for (const override of [{ expiresAt: Date.now() + 1000 }, { expiresAt: null }, { issuer: 'https://evil.example/service/oidc' }, { clientId: 'other' }, { accessToken: '' }, { accessToken: 'x'.repeat(20000) }, { sub: null }]) {
        assert.equal(readSession(storage({ ...session(), ...override }), config), null);
    }
    assert.equal(readSession({ getItem: () => '{broken' }, config), null);
    assert.equal(readSession({ getItem() { throw new Error('disabled'); } }, config), null);
});

test('an account must have a matching subject and a currently allowed role', () => {
    assert.deepEqual(acceptedAccount({ sub: 'reader-1', email: 'reader@example.test', roles: ['selfRegistered'] }, 'reader-1').roles, ['selfRegistered']);
    for (const info of [{ sub: 'another', roles: ['admin'] }, { sub: 'reader-1', roles: [] }, { sub: 'reader-1', roles: ['blocked'] }, { sub: 'reader-1', roles: 'admin' }, null]) {
        assert.throws(() => acceptedAccount(info, 'reader-1'), { code: 'accountDenied' });
    }
});

test('callback messages bind source window, origin, path, and a single exact state', () => {
    const popup = {};
    const event = { source: popup, origin: 'http://127.0.0.1:8000', data: { type: CALLBACK_MESSAGE, url: `${config.callback}?code=test&state=expected` } };
    assert.ok(matchingCallback(event, popup, config.callback, 'expected'));
    for (const modified of [{ ...event, source: {} }, { ...event, origin: 'https://evil.example' }, { ...event, data: { ...event.data, type: 'other' } }, ...[
        `${config.callback}?state=wrong`, `${config.callback}?state=expected&state=expected`, `${config.callback}?state=expected#code=test`,
        'https://evil.example/auth/callback.html?state=expected', 'http://127.0.0.1:8000/other?state=expected', 'not a URL',
    ].map((url) => ({ ...event, data: { ...event.data, url } }))]) {
        assert.equal(matchingCallback(modified, popup, config.callback, 'expected'), null);
    }
});

test('explicit cancellation and timeout clean up listeners; apparent closure is advisory', async () => {
    for (const cause of ['cancelled', 'timeout', 'success']) {
        const listeners = new Map();
        const timers = new Map();
        const host = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => listeners.delete(type), setInterval: (fn) => { timers.set('closed', fn); return 'closed'; }, setTimeout: (fn) => { timers.set('timeout', fn); return 'timeout'; }, clearInterval: (id) => timers.delete(id), clearTimeout: (id) => timers.delete(id) };
        const popup = { closed: cause === 'cancelled' };
        const controller = new AbortController();
        const waiter = waitForCallback(host, popup, config.callback, 'state', { signal: controller.signal });
        if (cause === 'success') {
            listeners.get('message')({ source: popup, origin: 'http://127.0.0.1:8000', data: { type: CALLBACK_MESSAGE, url: `${config.callback}?code=test&state=state` } });
            assert.equal((await waiter.promise).searchParams.get('code'), 'test');
        } else {
            if (cause === 'cancelled') controller.abort(Object.assign(new Error('cancelled'), { code: 'cancelled' }));
            else timers.get('timeout')();
            await assert.rejects(waiter.promise, { code: cause });
        }
        assert.equal(timers.size, 0);
        assert.equal(listeners.size, 0);
    }
});

function mockProvider(reply) {
    const requests = [];
    return { requests, fetcher: async (url, options) => {
        requests.push({ url: String(url), options });
        assert.equal(options.credentials, 'omit');
        if (String(url).endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: config.issuer, authorization_endpoint: `${config.issuer}/authorize`, token_endpoint: `${config.issuer}/token`, userinfo_endpoint: `${config.issuer}/me`, jwks_uri: `${config.issuer}/jwks`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] });
        assert.equal(String(url), `${config.issuer}/me`);
        assert.equal(new Headers(options.headers).get('authorization'), 'Bearer opaque-test-token');
        return reply();
    } };
}

test('each action revalidates roles with UserInfo; local role flags never authorize access', async () => {
    let roles = ['selfRegistered'];
    const provider = mockProvider(() => Response.json({ sub: 'reader-1', roles }));
    const store = storage({ ...session(), roles: ['admin'] });
    const client = createAccountClient(config, { storage: store, host: {}, fetcher: provider.fetcher });
    assert.equal((await client.current()).account.roles[0], 'selfRegistered');
    roles = [];
    await assert.rejects(client.current(), { code: 'accountDenied' });
    assert.equal(readSession(store, config), null);
    assert.equal(provider.requests.filter((request) => request.url.endsWith('/me')).length, 2);
});

test('revoked bearer tokens clear the session; provider outage denies action', async () => {
    for (const status of [401, 503]) {
        const provider = mockProvider(() => new Response('', { status, ...(status === 401 ? { headers: { 'www-authenticate': 'Bearer error="invalid_token"' } } : {}) }));
        const store = storage(session());
        const client = createAccountClient(config, { storage: store, host: {}, fetcher: provider.fetcher });
        if (status === 401) assert.equal(await client.current(), null);
        else await assert.rejects(client.current(), { code: 'unavailable' });
        assert.equal(readSession(store, config), null);
    }
});

test('expired sessions request no UserInfo and do not authorize an action', async () => {
    const client = createAccountClient(config, { storage: storage({ ...session(), expiresAt: Date.now() - 1000 }), host: {}, fetcher: () => { throw new Error('must not fetch'); } });
    assert.equal(client.hasSession(), false);
    assert.equal(await client.current(), null);
});
