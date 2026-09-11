import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { createAttempt } from '../src/auth-attempt.mjs';

const source = await readFile(new URL('../src/auth.js', import.meta.url), 'utf8');
const clientImport = "import { authError, createAccountClient, normalizeConfig } from './auth-client.js';";
assert.ok(source.startsWith(clientImport), 'Update dependency injection if the UI client import changes');
const uiSource = source.slice(clientImport.length).replace("import { createAttempt } from './auth-attempt.mjs';", '');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const account = { sub: 'reader-1', roles: ['selfRegistered'] };

function ui({ parent, accountClient } = {}) {
    const documentListeners = new Map();
    const navigations = [];
    const newTabs = [];
    const downloads = [];
    const popups = [];
    const fetches = [];
    let currentUrl = 'https://scriptahub.com/reader/index.html?lang=en';
    const location = {
        get href() { return currentUrl; },
        set href(value) { currentUrl = new URL(value, currentUrl).href; navigations.push(currentUrl); },
        get origin() { return new URL(currentUrl).origin; },
    };

    class Element {
        constructor(tag) {
            this.tagName = tag.toUpperCase();
            this.children = [];
            this.attributes = new Map();
            this.listeners = new Map();
            this.dataset = {};
            this.programmaticClicks = 0;
            this.isConnected = true;
        }
        append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
        setAttribute(name, value) { this.attributes.set(name, String(value)); }
        removeAttribute(name) { this.attributes.delete(name); }
        hasAttribute(name) { return this.attributes.has(name); }
        addEventListener(type, handler, options = {}) {
            const handlers = this.listeners.get(type) || [];
            handlers.push({ handler, once: options.once });
            this.listeners.set(type, handlers);
        }
        emit(type, event) {
            for (const entry of [...this.listeners.get(type) || []]) {
                entry.handler(event);
                if (entry.once) this.listeners.get(type).splice(this.listeners.get(type).indexOf(entry), 1);
            }
        }
        closest() { return this.tagName === 'A' && this.href ? this : this.parentNode?.closest(); }
        showModal() { this.open = true; }
        close() { this.open = false; this.emit('close', { target: this }); }
        remove() { this.removed = true; this.isConnected = false; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); }
        focus() { this.focused = true; }
        click() { this.programmaticClicks++; activate(this); }
    }

    const document = {
        currentScript: { src: 'https://scriptahub.com/assets/auth.js' },
        documentElement: { lang: 'en' },
        head: new Element('head'),
        body: new Element('body'),
        activeElement: new Element('button'),
        createElement: (tag) => new Element(tag),
        addEventListener(type, handler) {
            const handlers = documentListeners.get(type) || [];
            handlers.push(handler);
            documentListeners.set(type, handlers);
        },
    };
    function activate(element, options = {}) {
        const event = {
            type: 'click', button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
            ...options, target: element, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        };
        element.emit(event.type, event);
        const pending = Promise.all((documentListeners.get(event.type) || []).map((handler) => handler(event)));
        if (!event.defaultPrevented && element.tagName === 'A') {
            if (element.hasAttribute('download')) downloads.push(element.href);
            else if (element.target === '_blank') newTabs.push(element.href);
            else location.href = element.href;
        }
        return { event, pending };
    }
    const window = {
        location, setTimeout, clearTimeout,
        open(url, target, features) {
            const popup = { url, target, features, document: { body: { textContent: '' } }, closed: false, close() { this.closed = true; } };
            popups.push(popup);
            return popup;
        },
    };
    window.parent = parent || window;
    const client = accountClient || { hasSession: () => true, current: async () => ({ account }), signIn: async () => { throw new Error('A current account should not sign in again'); } };
    client.commit ||= () => {};
    client.discard ||= () => {};
    const context = vm.createContext({
        URL, location, window, document, createAttempt, setTimeout, clearTimeout, performance, AbortController,
        AbortSignal: { timeout: () => undefined },
        sessionStorage: {},
        authError: (code) => Object.assign(new Error(code), { code }),
        normalizeConfig: (input) => input,
        createAccountClient: () => client,
        fetch: async (url) => { fetches.push(String(url)); return { ok: true, json: async () => ({ issuer: 'https://accounts.example/oidc', clientId: 'scriptahub-web' }) }; },
    });
    vm.runInContext(uiSource, context, { filename: 'src/auth.js' });
    function link(options = {}) {
        const element = new Element('a');
        element.href = options.href || 'https://scriptahub.com/books/example/book.pdf';
        element.target = options.target || '';
        if (options.action) element.dataset.authAction = options.action;
        if (options.download) element.setAttribute('download', '');
        document.body.append(element);
        return element;
    }
    return {
        window, document, link, activate, location, navigations, newTabs, downloads, popups, fetches,
        dialogs: () => document.body.children.filter((element) => element.tagName === 'DIALOG' && !element.removed),
    };
}

test('same-origin reader frames share the exact parent account function and pending sign-in', async () => {
    let finishSignIn;
    let signIns = 0;
    const top = ui({ accountClient: {
        hasSession: () => false,
        current: async () => null,
        signIn: () => { signIns++; return new Promise((resolve) => { finishSignIn = resolve; }); },
    } });
    const firstFrame = ui({ parent: top.window });
    const secondFrame = ui({ parent: top.window });
    assert.equal(firstFrame.window.ScriptaHubAuth.requireAccount, top.window.ScriptaHubAuth.requireAccount);
    assert.equal(secondFrame.window.ScriptaHubAuth.requireAccount, top.window.ScriptaHubAuth.requireAccount);
    const owner = {};
    const first = top.window.ScriptaHubAuth.requireAccount('feedback', owner, 1);
    const second = firstFrame.window.ScriptaHubAuth.requireAccount('feedback', owner, 1);
    const third = secondFrame.window.ScriptaHubAuth.requireAccount('download', {}, 1);
    assert.equal(second, first);
    assert.equal(await third, null);
    await tick();
    assert.equal(signIns, 1);
    assert.equal(top.popups.length, 1);
    assert.equal(firstFrame.popups.length + secondFrame.popups.length, 0);
    assert.equal(firstFrame.fetches.length + secondFrame.fetches.length, 0);
    finishSignIn({ account });
    const grant = await first;
    assert.equal(grant.account, account);
    assert.equal(await second, grant);
    grant.publish(() => {});
    assert.equal(top.popups[0].closed, true);
});

test('cross-origin frames keep their own account function', async () => {
    const parent = { get location() { throw new Error('Cross-origin access denied'); }, ScriptaHubAuth: { requireAccount() { throw new Error('Must not share this API'); } } };
    const frame = ui({ parent });
    await tick();
    assert.notEqual(frame.window.ScriptaHubAuth.requireAccount, parent.ScriptaHubAuth.requireAccount);
    assert.equal(frame.fetches.length, 1);
    const grant = await frame.window.ScriptaHubAuth.requireAccount('feedback', {}, 1);
    assert.equal(grant.account, account);
    grant.cancel();
});

test('middle, modified, and target-blank actions wait for a real Continue link without replacing the current page', async () => {
    const cases = [
        { type: 'auxclick', button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { target: '_blank' },
    ];
    for (const options of cases) {
        const page = ui();
        await tick();
        const originalUrl = page.location.href;
        const original = page.link({ target: options.target });
        const activation = page.activate(original, options);
        assert.equal(activation.event.defaultPrevented, true);
        await tick();
        assert.equal(original.programmaticClicks, 0);
        assert.equal(page.location.href, originalUrl);
        assert.deepEqual(page.newTabs, []);
        assert.equal(page.dialogs().length, 1);
        const dialog = page.dialogs()[0];
        const actions = dialog.children.find((child) => child.tagName === 'DIV');
        const proceed = actions.children.find((child) => child.tagName === 'A');
        assert.equal(proceed.href, original.href);
        assert.equal(proceed.target, '_blank');
        assert.equal(proceed.rel, 'noopener noreferrer');
        assert.equal(proceed.textContent, 'Continue');
        const continuation = page.activate(proceed);
        assert.equal(continuation.event.defaultPrevented, false, 'The authenticated Continue link must bypass the gate');
        await Promise.all([activation.pending, continuation.pending]);
        assert.deepEqual(page.newTabs, [original.href]);
        assert.equal(page.location.href, originalUrl);
        assert.deepEqual(page.navigations, []);
        assert.equal(page.dialogs().length, 0);
        assert.equal(original.hasAttribute('aria-busy'), false);
        assert.equal(page.popups.length, 0);
    }
});

test('cancelling the new-tab continuation leaves the current page and requested link unchanged', async () => {
    const page = ui();
    await tick();
    const original = page.link({ target: '_blank' });
    const originalUrl = page.location.href;
    const activation = page.activate(original);
    await tick();
    const dialog = page.dialogs()[0];
    const cancel = dialog.children.find((child) => child.tagName === 'DIV').children.find((child) => child.tagName === 'BUTTON');
    await page.activate(cancel).pending;
    await activation.pending;
    assert.deepEqual(page.newTabs, []);
    assert.equal(page.location.href, originalUrl);
    assert.equal(original.programmaticClicks, 0);
    assert.equal(original.hasAttribute('aria-busy'), false);
    assert.equal(page.document.activeElement.focused, true);
});

test('normal same-page action replays exactly once after authentication', async () => {
    const page = ui();
    await tick();
    const original = page.link({ href: 'https://scriptahub.com/feedback/index.html?book=example', action: 'feedback' });
    const activation = page.activate(original);
    assert.equal(activation.event.defaultPrevented, true);
    assert.deepEqual(page.navigations, []);
    await activation.pending;
    assert.equal(original.programmaticClicks, 1);
    assert.deepEqual(page.navigations, [original.href]);
    assert.deepEqual(page.newTabs, []);
    assert.equal(page.dialogs().length, 0);
    assert.equal(original.hasAttribute('aria-busy'), false);
});

test('a download attribute keeps the requested download behavior after a modified click', async () => {
    const page = ui();
    await tick();
    const original = page.link({ download: true });
    await page.activate(original, { metaKey: true }).pending;
    assert.equal(original.programmaticClicks, 1);
    assert.deepEqual(page.downloads, [original.href]);
    assert.deepEqual(page.navigations, []);
    assert.deepEqual(page.newTabs, []);
    assert.equal(page.dialogs().length, 0);
});

test('Cancel from the original tab settles a held attempt and an immediate retry owns its UI', async () => {
    let release;
    let calls = 0;
    let commits = 0;
    const page = ui({ accountClient: {
        hasSession: () => false,
        current: async () => null,
        signIn() {
            calls++;
            if (calls === 1) return new Promise((resolve) => { release = resolve; });
            return Promise.resolve({ account });
        },
        commit() { commits++; },
    } });
    const first = page.window.ScriptaHubAuth.requireAccount('download', {}, 1);
    await tick();
    const pendingStatus = page.document.body.children.find((node) => node.className === 'scriptahub-auth-pending');
    await page.activate(pendingStatus.children.find((node) => node.tagName === 'BUTTON')).pending;
    assert.equal(await first, null);
    const second = page.window.ScriptaHubAuth.requireAccount('feedback', {}, 1);
    const grant = await second;
    release({ account });
    await tick();
    assert.equal(page.document.body.children.filter((node) => node.className === 'scriptahub-auth-pending').length, 1);
    assert.equal(commits, 0);
    grant.publish(() => {});
    assert.equal(commits, 1);
    assert.equal(page.document.body.children.filter((node) => node.className === 'scriptahub-auth-pending').length, 0);
});

test('a retained Continue node rejects click and auxclick after cancellation', async () => {
    let commits = 0;
    const page = ui({ accountClient: { hasSession: () => true, current: async () => ({ account }), commit() { commits++; } } });
    await tick();
    const original = page.link({ target: '_blank' });
    const activation = page.activate(original);
    await tick();
    const dialog = page.dialogs()[0];
    const actions = dialog.children.find((node) => node.tagName === 'DIV');
    const continuation = actions.children.find((node) => node.tagName === 'A');
    const cancel = actions.children.find((node) => node.tagName === 'BUTTON');
    await page.activate(cancel).pending;
    await activation.pending;
    for (const options of [{ type: 'click' }, { type: 'auxclick', button: 1 }]) {
        const stale = page.activate(continuation, options);
        await stale.pending;
        assert.equal(stale.event.defaultPrevented, true);
    }
    assert.equal(commits, 0);
    assert.deepEqual(page.newTabs, []);
});

test('a captured PDF URL is preserved when the original anchor changes during authentication', async () => {
    let release;
    const page = ui({ accountClient: {
        hasSession: () => true, current: () => new Promise((resolve) => { release = resolve; }), commit() {},
    } });
    await tick();
    const original = page.link({ href: 'https://scriptahub.com/book/edition-files/original/en.pdf', download: true });
    const activation = page.activate(original);
    await tick();
    original.href = 'https://scriptahub.com/book/replacement.pdf';
    release({ account });
    await activation.pending;
    assert.deepEqual(page.downloads, ['https://scriptahub.com/book/edition-files/original/en.pdf']);
    assert.equal(original.href, 'https://scriptahub.com/book/replacement.pdf');
});


test('legacy ownerless and unversioned callers cannot receive a truthy account grant', async () => {
    let currentCalls = 0;
    let commits = 0;
    const page = ui({ accountClient: {
        hasSession: () => true,
        current: async () => { currentCalls++; return { account }; },
        commit: () => { commits++; },
    } });
    await tick();
    for (const args of [['feedback'], ['feedback', {}], ['feedback', null, 1], ['feedback', 'shared-owner', 1], ['feedback', {}, 2], ['feedback', {}, '1']]) {
        const result = await page.window.ScriptaHubAuth.requireAccount(...args);
        result?.cancel?.();
        assert.equal(result, null, 'Legacy callers must not mistake a grant for an authenticated account.');
    }
    assert.equal(currentCalls, 0);
    assert.equal(commits, 0);
    assert.equal(page.popups.length, 0);
    assert.equal(page.document.body.children.filter((node) => node.className === 'scriptahub-auth-pending').length, 0);
    assert.match(page.dialogs()[0].children.find((node) => node.tagName === 'P').textContent, /Reload/);
    assert.equal(page.window.ScriptaHubAuth.grantApiVersion, 1);
});

test('a new iframe never delegates its grant to an old or mismatched parent API', async () => {
    for (const grantApiVersion of [undefined, 2, '1']) {
        let parentCalls = 0;
        let localCommits = 0;
        const parent = { location: { origin: 'https://scriptahub.com' }, ScriptaHubAuth: {
            grantApiVersion, requireAccount() { parentCalls++; return Promise.resolve({ sub: 'old-parent-account' }); },
        } };
        const frame = ui({ parent, accountClient: {
            hasSession: () => true, current: async () => ({ account }), commit() { localCommits++; },
        } });
        await tick();
        const grant = await frame.window.ScriptaHubAuth.requireAccount('download', {}, 1);
        try {
            assert.equal(parentCalls, 0);
            assert.equal(frame.fetches.length, 1);
            assert.notEqual(frame.window.ScriptaHubAuth.requireAccount, parent.ScriptaHubAuth.requireAccount);
            grant.publish(() => {});
            assert.equal(localCommits, 1);
        } finally { grant?.cancel?.(); }
    }
});

test('an incompatible duplicate cannot consume or cancel a valid pending owner', async () => {
    let release;
    let commits = 0;
    const page = ui({ accountClient: {
        hasSession: () => true,
        current: () => new Promise((resolve) => { release = resolve; }),
        commit() { commits++; },
    } });
    await tick();
    const owner = {};
    const pending = page.window.ScriptaHubAuth.requireAccount('feedback', owner, 1);
    await tick();
    assert.equal(await page.window.ScriptaHubAuth.requireAccount('feedback', owner), null);
    assert.equal(page.dialogs().length, 0, 'A stale caller must not disrupt the active grant UI.');
    assert.equal(page.window.ScriptaHubAuth.requireAccount('feedback', owner, 1), pending);
    release({ account });
    const grant = await pending;
    assert.equal(commits, 0);
    grant.publish(() => {});
    assert.equal(commits, 1);
    assert.throws(() => grant.publish(() => {}));
});

test('a late incompatible global API cannot be invoked by the new PDF handler', async () => {
    const page = ui();
    let legacyCalls = 0;
    page.window.ScriptaHubAuth = { requireAccount() { legacyCalls++; return Promise.resolve(account); } };
    await page.activate(page.link()).pending;
    assert.equal(legacyCalls, 0);
    assert.equal(page.popups.length, 0);
    assert.deepEqual(page.navigations, []);
    assert.deepEqual(page.downloads, []);
    assert.match(page.dialogs()[0].children.find((node) => node.tagName === 'P').textContent, /Reload/);
});
