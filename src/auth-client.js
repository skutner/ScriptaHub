import * as oidc from 'openid-client';

export const SESSION_KEY = 'scriptahub:account:v1';
export { CALLBACK_MESSAGE, matchingCallback, waitForCallback } from './auth-transport.mjs';
import { waitForCallback } from './auth-transport.mjs';
export const MEMBER_ROLES = ['selfRegistered', 'user', 'admin'];

export function authError(code) {
    return Object.assign(new Error(code), { code });
}

export function normalizeConfig(input, callbackUrl) {
    if (!input || typeof input.issuer !== 'string' || !input.issuer) throw authError('unavailable');
    let issuer;
    let callback;
    try { issuer = new URL(input.issuer); callback = new URL(callbackUrl); } catch { throw authError('unavailable'); }
    const loopback = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const secure = (url) => url.protocol === 'https:' || (url.protocol === 'http:' && loopback(url));
    if (!secure(issuer) || issuer.href !== input.issuer || issuer.username || issuer.password
        || issuer.search || issuer.hash || !issuer.pathname.endsWith('/service/oidc')
        || !secure(callback) || callback.username || callback.password || callback.search || callback.hash
        || typeof input.clientId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._~-]{2,127}$/.test(input.clientId)) {
        throw authError('unavailable');
    }
    return { issuer: issuer.href, clientId: input.clientId, callback: callback.href };
}

export function readSession(storage, config, now = Date.now()) {
    try {
        const value = JSON.parse(storage?.getItem(SESSION_KEY) || 'null');
        if (value?.issuer === config.issuer && value?.clientId === config.clientId
            && typeof value.sub === 'string' && value.sub && typeof value.accessToken === 'string'
            && value.accessToken.length > 0 && value.accessToken.length < 16384
            && Number.isFinite(value.expiresAt) && value.expiresAt > now + 5000) return value;
    } catch { /* An unavailable or malformed browser store is not a session. */ }
    return null;
}

export function acceptedAccount(info, expectedSub) {
    if (!info || typeof expectedSub !== 'string' || !expectedSub || info.sub !== expectedSub
        || !Array.isArray(info.roles) || !info.roles.some((role) => MEMBER_ROLES.includes(role))) {
        throw authError('accountDenied');
    }
    return { sub: info.sub, email: typeof info.email === 'string' ? info.email : '', roles: info.roles.filter((role) => MEMBER_ROLES.includes(role)) };
}

const unowned = { check() {}, wait: (work) => work };

export function createAccountClient(config, { storage, host = window, fetcher = fetch } = {}) {
    let discovery;
    let memorySession = readSession(storage, config);
    const candidates = new WeakMap();
    function clear(snapshot = memorySession) {
        if (memorySession === snapshot) memorySession = null;
        try {
            const saved = storage?.getItem(SESSION_KEY);
            if (snapshot && saved === JSON.stringify(snapshot)) storage.removeItem(SESSION_KEY);
        } catch { /* Storage may be disabled. */ }
    }
    async function provider(attempt) {
        attempt.check();
        // Only metadata is shared. A cached fetch closure never owns an attempt signal.
        if (!discovery) {
            const request = oidc.discovery(new URL(config.issuer), config.clientId, undefined, oidc.None(), {
                timeout: 15,
                [oidc.customFetch]: (url, options) => fetcher(url, { ...options, credentials: 'omit' }),
                execute: config.issuer.startsWith('http:') ? [oidc.allowInsecureRequests] : [],
            });
            discovery = request;
            request.catch(() => { if (discovery === request) discovery = undefined; });
        }
        const discovered = await attempt.wait(discovery);
        attempt.check();
        const client = new oidc.Configuration(discovered.serverMetadata(), config.clientId, undefined, oidc.None());
        if (config.issuer.startsWith('http:')) oidc.allowInsecureRequests(client);
        oidc.enableNonRepudiationChecks(client);
        client.timeout = 15;
        client[oidc.customFetch] = (url, options) => {
            attempt.check();
            const signals = [options.signal, attempt.signal].filter(Boolean);
            return fetcher(url, { ...options, credentials: 'omit', ...(signals.length ? { signal: AbortSignal.any(signals) } : {}) });
        };
        return client;
    }
    function candidate(account, session, attempt) {
        const value = Object.freeze({ account: Object.freeze({ ...account, roles: Object.freeze([...account.roles]) }) });
        candidates.set(value, { session, attempt });
        return value;
    }
    async function current(attempt = unowned) {
        attempt.check();
        const session = memorySession;
        if (!session || session.expiresAt <= Date.now() + 5000) { clear(session); return null; }
        try {
            const client = await provider(attempt);
            attempt.check();
            const info = await attempt.wait(oidc.fetchUserInfo(client, session.accessToken, session.sub));
            attempt.check();
            return candidate(acceptedAccount(info, session.sub), session, attempt);
        } catch (error) {
            // A delayed old failure may never erase a newer attempt's session.
            attempt.check();
            clear(session);
            if (error.code === 'accountDenied') throw error;
            if (Number(error.status) === 401 || Number(error.cause?.status) === 401 || error.error === 'invalid_token') return null;
            throw authError('unavailable');
        }
    }
    async function signIn(popup, mode = 'signup', attempt = unowned) {
        let callback;
        try {
            const client = await provider(attempt);
            attempt.check();
            const verifier = oidc.randomPKCECodeVerifier();
            const state = oidc.randomState();
            const nonce = oidc.randomNonce();
            const challenge = await attempt.wait(oidc.calculatePKCECodeChallenge(verifier));
            attempt.check();
            const url = oidc.buildAuthorizationUrl(client, {
                redirect_uri: config.callback, scope: 'openid email roles', state, nonce,
                code_challenge: challenge, code_challenge_method: 'S256',
                ...(mode === 'signup' ? { screen_hint: 'signup' } : {}),
            });
            callback = waitForCallback(host, popup, config.callback, state, { signal: attempt.signal, timeoutMs: attempt.remaining });
            callback.promise.catch(() => {});
            attempt.check();
            popup.location.replace(url.href);
            const response = await attempt.wait(callback.promise);
            attempt.check();
            const tokens = await attempt.wait(oidc.authorizationCodeGrant(client, response, {
                pkceCodeVerifier: verifier, expectedState: state, expectedNonce: nonce,
            }));
            attempt.check();
            const claims = tokens.claims();
            if (!claims?.sub || !Number.isFinite(claims.exp) || !tokens.access_token || tokens.token_type?.toLowerCase() !== 'bearer'
                || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) throw authError('accountDenied');
            const expiresAt = Math.min(Date.now() + tokens.expires_in * 1000, claims.exp * 1000);
            const info = await attempt.wait(oidc.fetchUserInfo(client, tokens.access_token, claims.sub));
            attempt.check();
            const account = acceptedAccount(info, claims.sub);
            return candidate(account, {
                issuer: config.issuer, clientId: config.clientId, sub: claims.sub, accessToken: tokens.access_token,
                expiresAt,
            }, attempt);
        } catch (error) {
            if (error.error === 'access_denied') throw authError('cancelled');
            throw error;
        } finally {
            callback?.dispose();
            try { popup.close(); } catch { /* A detached popup closes through its acknowledgment. */ }
        }
    }
    function commit(value, attempt) {
        attempt.check();
        const retained = candidates.get(value);
        if (retained?.attempt !== attempt) throw authError('cancelled');
        const session = retained.session;
        if (!session || session.expiresAt <= Date.now() + 5000) throw authError('timeout');
        candidates.delete(value);
        memorySession = session;
        try { storage?.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Keep the session in memory. */ }
    }
    return { current, signIn, commit, discard: (value) => candidates.delete(value), hasSession: () => Boolean(memorySession && memorySession.expiresAt > Date.now() + 5000) };
}
