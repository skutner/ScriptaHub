export const CALLBACK_MESSAGE = 'scriptahub:oidc-callback';
export const CALLBACK_ACK = 'scriptahub:oidc-delivered';
export const callbackChannelName = (state) => `scriptahub:oidc:${state}`;

export function openCallbackChannel(host, state) {
    try {
        return typeof host.BroadcastChannel === 'function' ? new host.BroadcastChannel(callbackChannelName(state)) : null;
    } catch { return null; }
}

export function callbackPayload(data, callbackUrl, state) {
    if (data?.type !== CALLBACK_MESSAGE || typeof data.url !== 'string' || data.url.length > 16384) return null;
    try {
        const expected = new URL(callbackUrl);
        const url = new URL(data.url);
        if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash
            || url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== state
            || ['code', 'error', 'iss'].some((key) => url.searchParams.getAll(key).length > 1)
            || (url.searchParams.has('code') === url.searchParams.has('error'))
            || !(url.searchParams.get('code') || url.searchParams.get('error'))) return null;
        return url;
    } catch { return null; }
}

export function matchingCallback(event, popup, callbackUrl, state) {
    if (event.source !== popup || event.origin !== new URL(callbackUrl).origin) return null;
    return callbackPayload(event.data, callbackUrl, state);
}

export function waitForCallback(host, popup, callbackUrl, state, { signal, timeoutMs = 300000 } = {}) {
    const channel = openCallbackChannel(host, state);
    let dispose;
    let rejectWait;
    let settled = false;
    const promise = new Promise((resolve, reject) => {
        rejectWait = reject;
        const finish = (error, url) => {
            if (settled) return;
            settled = true;
            if (url) {
                const ack = { type: CALLBACK_ACK, state };
                try { channel?.postMessage(ack); } catch { /* Strict opener delivery remains available. */ }
                try { popup.postMessage(ack, new URL(callbackUrl).origin); } catch { /* COOP may sever this reference. */ }
            }
            dispose();
            if (error) reject(error);
            else resolve(url);
        };
        const receive = (event) => {
            const url = matchingCallback(event, popup, callbackUrl, state);
            if (url) finish(null, url);
        };
        const receiveChannel = (event) => {
            const url = callbackPayload(event.data, callbackUrl, state);
            if (url) finish(null, url);
        };
        const abort = () => finish(signal.reason || Object.assign(new Error('cancelled'), { code: 'cancelled' }));
        const timer = host.setTimeout(() => finish(Object.assign(new Error('timeout'), { code: 'timeout' })), timeoutMs);
        dispose = () => {
            host.removeEventListener('message', receive);
            signal?.removeEventListener('abort', abort);
            host.clearTimeout(timer);
            if (channel) { channel.onmessage = null; channel.close(); }
        };
        host.addEventListener('message', receive);
        if (channel) channel.onmessage = receiveChannel;
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
    });
    return { promise, dispose() {
        dispose();
        if (!settled) {
            settled = true;
            rejectWait(Object.assign(new Error('cancelled'), { code: 'cancelled' }));
        }
    } };
}
