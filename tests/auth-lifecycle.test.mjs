import assert from 'node:assert/strict';
import test from 'node:test';
import { createAttempt } from '../src/auth-attempt.mjs';
import { createAccountClient, SESSION_KEY } from '../src/auth-client.js';
import { controlledProvider, popupHost, deferred, fixtureConfig } from './fixtures/oidc-provider.mjs';

function store() {
    let value;
    return { getItem: () => value || null, setItem: (key, next) => { assert.equal(key, SESSION_KEY); value = next; }, removeItem: () => { value = undefined; } };
}
function attempt(t, { now, lifetime, onFinish } = {}) {
    let owned = true;
    const result = createAttempt({ generation: Symbol(), isCurrent: () => owned, now, lifetime, onFinish });
    t.after(() => result.cancel());
    return { attempt: result, supersede() { owned = false; } };
}

for (const mode of ['absent', 'throw', 'working']) {
    test(`verified candidate stays private until one-shot publication (${mode} channel)`, async (t) => {
        const provider = controlledProvider();
        const transport = popupHost(provider, { channelMode: mode, duplicate: true, apparentClosed: true });
        const storage = store();
        const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
        const scope = attempt(t).attempt;
        const candidate = await client.signIn(transport.popup, 'signup', scope);
        assert.equal(candidate.account.sub, 'fixture-reader');
        assert.equal(Object.hasOwn(candidate, 'accessToken'), false);
        assert.equal(storage.getItem(), null);
        assert.equal(client.hasSession(), false);
        let effects = 0;
        const grant = scope.grant(candidate.account, () => client.commit(candidate, scope));
        grant.publish(() => { effects++; assert.throws(() => grant.publish(() => effects++)); });
        assert.equal(effects, 1);
        assert.equal(provider.counts.token, 1);
        assert.equal(client.hasSession(), true);
        assert.equal(scope.state, 'published');
        assert.equal(transport.messages.size, 0);
        assert.ok(transport.channels.every((channel) => channel.closed));
    });
}

for (const stage of ['discovery', 'token', 'userinfo', 'jwks']) {
    for (const cause of ['cancel', 'deadline']) {
        test(`${cause} during ${stage} settles immediately and late responses never publish`, async (t) => {
            const provider = controlledProvider();
            const hold = provider.hold(stage);
            const transport = popupHost(provider);
            const storage = store();
            const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
            let time = 0;
            const scope = attempt(t, { now: () => time }).attempt;
            const work = client.signIn(transport.popup, 'signup', scope);
            await hold.entered;
            if (cause === 'cancel') scope.cancel();
            else { time = 300001; assert.throws(scope.check, { code: 'timeout' }); }
            await assert.rejects(work, { code: cause === 'cancel' ? 'cancelled' : 'timeout' });
            hold.resolve();
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(storage.getItem(), null);
            assert.equal(client.hasSession(), false);
            if (stage === 'discovery') assert.equal(transport.popup.navigations, 0);
        });
    }
}

test('ready grants remain cancellable and check monotonic deadline without timer delivery', (t) => {
    for (const expired of [false, true]) {
        let time = 0;
        const scope = attempt(t, { now: () => time }).attempt;
        let commits = 0;
        let effects = 0;
        const grant = scope.grant({}, () => commits++);
        if (expired) time = 300001;
        else grant.cancel();
        assert.throws(() => grant.publish(() => effects++), { code: expired ? 'timeout' : 'cancelled' });
        assert.equal(commits + effects, 0);
    }
});

test('effect failure consumes the grant and cannot automatically replay', (t) => {
    const scope = attempt(t).attempt;
    let commits = 0;
    const grant = scope.grant({}, () => commits++);
    assert.throws(() => grant.publish(() => { throw new Error('effect failed'); }), /effect failed/);
    assert.throws(() => grant.publish(() => {}));
    assert.equal(commits, 1);
    assert.equal(scope.state, 'published');
});

test('cancelled current UserInfo failure cannot clear the session published by immediate retry', async (t) => {
    const provider = controlledProvider();
    const transport = popupHost(provider);
    const storage = store();
    const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
    const initial = attempt(t).attempt;
    const candidate = await client.signIn(transport.popup, 'signup', initial);
    initial.grant(candidate.account, () => client.commit(candidate, initial)).publish(() => {});
    const existing = storage.getItem();
    const hold = provider.hold('userinfo');
    const first = attempt(t).attempt;
    const stale = client.current(first);
    await hold.entered;
    first.cancel();
    await assert.rejects(stale, { code: 'cancelled' });
    assert.equal(storage.getItem(), existing, 'Cancel preserves an unrelated valid session');
    const next = attempt(t).attempt;
    const current = await client.current(next);
    next.grant(current.account, () => client.commit(current, next)).publish(() => {});
    provider.state.userinfoError = 503;
    hold.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.hasSession(), true);
    assert.equal(storage.getItem(), existing);
});

test('old sign-in failure and cleanup cannot erase a completed retry session', async (t) => {
    const provider = controlledProvider();
    const transport = popupHost(provider);
    const storage = store();
    const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
    const first = attempt(t).attempt;
    const hold = provider.hold('token');
    const stale = client.signIn(transport.popup, 'signup', first);
    await hold.entered;
    first.cancel();
    await assert.rejects(stale, { code: 'cancelled' });
    const nextTransport = popupHost(provider);
    // The same host must own both attempts; each popup keeps its own reference.
    const next = attempt(t).attempt;
    const retryClient = createAccountClient(fixtureConfig, { storage, host: nextTransport.host, fetcher: provider.fetcher });
    const candidate = await retryClient.signIn(nextTransport.popup, 'signup', next);
    next.grant(candidate.account, () => retryClient.commit(candidate, next)).publish(() => {});
    const saved = storage.getItem();
    provider.state.tokenError = 'invalid_grant';
    hold.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(storage.getItem(), saved);
    assert.equal(retryClient.hasSession(), true);
});

for (const override of [{ badSignature: true }, { tokenClaims: { aud: 'other-client' } }, { tokenClaims: { nonce: 'wrong' } }, { tokenClaims: { iss: 'https://wrong.example' } }, { roles: ['blocked'] }]) {
    test(`unverified tokens or denied roles cannot produce a candidate: ${JSON.stringify(override)}`, async (t) => {
        const provider = controlledProvider();
        Object.assign(provider.state, override);
        const transport = popupHost(provider);
        const storage = store();
        const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
        await assert.rejects(client.signIn(transport.popup, 'signup', attempt(t).attempt));
        assert.equal(storage.getItem(), null);
        assert.equal(client.hasSession(), false);
    });
}

test('token lifetime starts before delayed UserInfo and failed publication releases the attempt', async (t) => {
    const provider = controlledProvider();
    provider.state.expiresIn = 10;
    const hold = provider.hold('userinfo');
    const transport = popupHost(provider);
    const storage = store();
    const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
    const scope = attempt(t).attempt;
    const work = client.signIn(transport.popup, 'signup', scope);
    await hold.entered;
    const now = Date.now();
    t.mock.method(Date, 'now', () => now + 20000);
    hold.resolve();
    const candidate = await work;
    const grant = scope.grant(candidate.account, () => client.commit(candidate, scope));
    let effects = 0;
    assert.throws(() => grant.publish(() => effects++), { code: 'timeout' });
    assert.equal(scope.state, 'expired');
    assert.equal(storage.getItem(), null);
    assert.equal(effects, 0);
});

test('a candidate cannot be published by a different attempt', async (t) => {
    const provider = controlledProvider();
    const transport = popupHost(provider);
    const storage = store();
    const client = createAccountClient(fixtureConfig, { storage, host: transport.host, fetcher: provider.fetcher });
    const first = attempt(t).attempt;
    const candidate = await client.signIn(transport.popup, 'signup', first);
    first.cancel();
    const next = attempt(t).attempt;
    assert.throws(() => next.grant(candidate.account, () => client.commit(candidate, next)).publish(() => {}), { code: 'cancelled' });
    assert.equal(next.state, 'cancelled');
    assert.equal(storage.getItem(), null);
});
