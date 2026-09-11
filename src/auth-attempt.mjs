export function attemptError(code) {
    return Object.assign(new Error(code), { code });
}

// The deadline covers authentication and the retained action, including Continue.
export function createAttempt({ generation, isCurrent, host = globalThis, now = () => performance.now(), lifetime = 300000, onFinish = () => {} }) {
    const controller = new AbortController();
    const deadline = now() + lifetime;
    const cleanups = new Set();
    let state = 'pending';
    let rejection;
    const stopped = new Promise((resolve, reject) => { rejection = reject; });
    stopped.catch(() => {});
    const timer = host.setTimeout(() => finish('expired', attemptError('timeout')), lifetime);

    function finish(next, error) {
        if (!['pending', 'ready'].includes(state)) return;
        state = next;
        host.clearTimeout(timer);
        controller.abort(error || attemptError('cancelled'));
        if (error) rejection(error);
        for (const cleanup of cleanups) {
            try { cleanup(); } catch { /* Cleanup cannot revive or retain an attempt. */ }
        }
        cleanups.clear();
        onFinish(error);
    }
    function check() {
        if (now() >= deadline && ['pending', 'ready'].includes(state)) finish('expired', attemptError('timeout'));
        if (state === 'expired') throw attemptError('timeout');
        if (!isCurrent() || !['pending', 'ready'].includes(state)) throw attemptError('cancelled');
    }
    const attempt = Object.freeze({
        generation,
        signal: controller.signal,
        get state() { return state; },
        get remaining() { return Math.max(0, deadline - now()); },
        check,
        async wait(work) {
            check();
            const result = await Promise.race([work, stopped]);
            check();
            return result;
        },
        addCleanup(cleanup) {
            if (['pending', 'ready'].includes(state)) cleanups.add(cleanup);
            else cleanup();
            return () => cleanups.delete(cleanup);
        },
        cancel() { finish('cancelled', attemptError('cancelled')); },
        fail(error) { finish(error?.code === 'timeout' ? 'expired' : 'cancelled', error); },
        grant(account, commit) {
            check();
            if (state !== 'pending') throw attemptError('cancelled');
            state = 'ready';
            return Object.freeze({
                account,
                cancel: attempt.cancel,
                onFinish: attempt.addCleanup,
                publish(effect) {
                    check();
                    if (state !== 'ready' || typeof effect !== 'function') throw attemptError('cancelled');
                    // Commit and consume synchronously before a possibly reentrant effect.
                    try { commit(); } catch (error) {
                        finish(error?.code === 'timeout' ? 'expired' : 'cancelled', error);
                        throw error;
                    }
                    finish('published');
                    return effect();
                },
            });
        },
    });
    return attempt;
}
