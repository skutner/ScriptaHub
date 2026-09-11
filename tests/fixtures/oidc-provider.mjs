import { createHash, generateKeyPairSync, sign } from 'node:crypto';

export const fixtureConfig = {
    issuer: 'http://127.0.0.1:17000/service/oidc',
    clientId: 'scriptahub-test',
    callback: 'http://127.0.0.1:18000/auth/callback.html',
};
export const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

export function controlledProvider(config = fixtureConfig) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'controlled-test', alg: 'RS256', use: 'sig' };
    const grants = new Map();
    let nextCode = 0;
    const counts = { discovery: 0, token: 0, userinfo: 0, jwks: 0 };
    const holds = new Map();
    const entered = new Map();
    const state = { roles: ['selfRegistered'], tokenClaims: {}, tokenError: null, userinfoError: null, badSignature: false, expiresIn: 300 };
    function authorize(url) {
        const params = new URL(url).searchParams;
        if (params.get('client_id') !== config.clientId || params.get('redirect_uri') !== config.callback
            || params.get('code_challenge_method') !== 'S256') throw new Error('Invalid controlled authorization request');
        const code = `fixture-code-${++nextCode}`;
        grants.set(code, params);
        const callback = new URL(config.callback);
        callback.searchParams.set('state', params.get('state'));
        callback.searchParams.set('code', code);
        callback.searchParams.set('iss', config.issuer);
        return callback;
    }
    async function fetcher(url, options = {}) {
        const path = new URL(url).pathname;
        const stage = path.endsWith('/.well-known/openid-configuration') ? 'discovery' : path.split('/').at(-1);
        counts[stage]++;
        entered.get(stage)?.resolve();
        const hold = holds.get(stage);
        if (hold) { holds.delete(stage); await hold.promise; }
        if (stage === 'discovery') return Response.json({
            issuer: config.issuer, authorization_endpoint: `${config.issuer}/authorize`, token_endpoint: `${config.issuer}/token`,
            userinfo_endpoint: `${config.issuer}/userinfo`, jwks_uri: `${config.issuer}/jwks`, response_types_supported: ['code'],
            subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
        });
        if (stage === 'jwks') return Response.json({ keys: [jwk] });
        if (stage === 'userinfo') {
            if (state.userinfoError) return new Response('', { status: state.userinfoError });
            return Response.json({ sub: 'fixture-reader', email: 'reader@example.test', roles: state.roles });
        }
        if (stage === 'token') {
            if (state.tokenError) return Response.json({ error: state.tokenError }, { status: 400 });
            const data = new URLSearchParams(options.body);
            const grant = grants.get(data.get('code'));
            grants.delete(data.get('code'));
            if (!grant || createHash('sha256').update(data.get('code_verifier') || '').digest('base64url') !== grant.get('code_challenge')) {
                return Response.json({ error: 'invalid_grant' }, { status: 400 });
            }
            const claims = {
                iss: config.issuer, sub: 'fixture-reader', aud: config.clientId, nonce: grant.get('nonce'),
                iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...state.tokenClaims,
            };
            const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');
            const unsigned = `${encode({ alg: 'RS256', kid: jwk.kid })}.${encode(claims)}`;
            const signature = sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
            return Response.json({ access_token: 'controlled-bearer', token_type: 'Bearer', expires_in: state.expiresIn,
                id_token: `${unsigned}.${state.badSignature ? signature.split('').reverse().join('') : signature}` });
        }
        throw new Error(`Unexpected controlled endpoint ${path}`);
    }
    return { config, fetcher, authorize, counts, state, hold(stage) {
        const gate = deferred();
        const reached = deferred();
        holds.set(stage, gate);
        entered.set(stage, reached);
        return { ...gate, entered: reached.promise };
    } };
}

export function popupHost(provider, { apparentClosed = false, channelMode = 'absent', duplicate = false } = {}) {
    const messages = new Set();
    const channels = [];
    const host = {
        setTimeout, clearTimeout,
        addEventListener(type, handler) { if (type === 'message') messages.add(handler); },
        removeEventListener(type, handler) { if (type === 'message') messages.delete(handler); },
    };
    if (channelMode === 'throw') host.BroadcastChannel = class { constructor() { throw new Error('Unavailable channel'); } };
    if (channelMode === 'working') host.BroadcastChannel = class {
        constructor(name) { this.name = name; channels.push(this); }
        postMessage() {}
        close() { this.closed = true; }
    };
    const popup = { closed: apparentClosed, navigations: 0, postMessage() {}, close() { this.closed = true; }, location: {
        replace(url) {
            popup.navigations++;
            const response = provider.authorize(url);
            const data = { type: 'scriptahub:oidc-callback', url: response.href };
            queueMicrotask(() => {
                if (channelMode === 'working') channels[0].onmessage?.({ data });
                if (channelMode !== 'working' || duplicate) {
                    for (const handler of messages) handler({ source: popup, origin: new URL(provider.config.callback).origin, data });
                }
            });
        },
    } };
    return { host, popup, messages, channels };
}
