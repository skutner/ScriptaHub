import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { controlledProvider } from './oidc-provider.mjs';

// Disposable loopback-only transport fixture; never reads deployment configuration.
const config = { clientId: 'scriptahub-test' };
let provider;
let coop = false;
let transports = {};
const transportScript = (peer) => transports[peer] === 'absent' ? '<script>window.BroadcastChannel=undefined</script>' : transports[peer] === 'throw' ? '<script>window.BroadcastChannel=class{constructor(){throw new Error("Fixture channel unavailable")}}</script>' : '';
const holds = new Map();
const counts = { actions: 0 };
const providerServer = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, config.issuer);
        response.setHeader('access-control-allow-origin', new URL(config.callback).origin);
        response.setHeader('access-control-allow-headers', 'authorization, content-type');
        response.setHeader('cache-control', 'no-store');
        if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
        if (url.pathname.endsWith('/authorize')) {
            if (coop) response.setHeader('cross-origin-opener-policy', 'same-origin');
            const callback = provider.authorize(url);
            response.setHeader('content-type', 'text/html');
            response.end(`<!doctype html><title>Controlled identity provider</title><h1>Controlled identity provider</h1><p>Fixture account: reader@example.test</p><a id="approve" href="${callback.href.replaceAll('&', '&amp;')}">Complete fixture sign in</a><p id="opener"></p><script>document.getElementById('opener').textContent=window.opener?'Opener present':'Opener absent'</script>`);
            return;
        }
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const result = await provider.fetcher(url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks).toString() });
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { response.writeHead(500); response.end(error.message); }
});
await new Promise((resolve) => providerServer.listen(0, '127.0.0.1', resolve));
config.issuer = `http://127.0.0.1:${providerServer.address().port}/service/oidc`;
const site = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, config.callback);
        response.setHeader('cache-control', 'no-store');
        if (url.pathname === '/fixture/control') {
            const chunks = [];
            for await (const chunk of request) chunks.push(chunk);
            const command = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
            if (command.coop !== undefined) coop = command.coop;
            if (command.transports) transports = command.transports;
            if (command.state) Object.assign(provider.state, command.state);
            if (command.hold) holds.set(command.hold, { ...provider.hold(command.hold), reached: false });
            if (command.hold) {
                const hold = holds.get(command.hold);
                hold.entered.then(() => { hold.reached = true; });
            }
            if (command.release) { holds.get(command.release)?.resolve(); holds.delete(command.release); }
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify({ counts: { ...counts, ...provider.counts }, coop,
                holds: Object.fromEntries([...holds].map(([key, value]) => [key, value.reached])) }));
            return;
        }
        if (url.pathname === '/auth/config.json') {
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify(config));
            return;
        }
        if (url.pathname === '/requested.pdf' || url.pathname === '/historical.pdf') {
            counts.actions++;
            response.setHeader('content-type', 'text/html');
            response.end('<!doctype html><title>Exact PDF action reached</title><h1>Exact PDF action reached</h1>');
            return;
        }
        if (url.pathname === '/' || url.pathname === '/frame.html') {
            response.setHeader('content-type', 'text/html');
            response.end(`<!doctype html><html lang="en"><head><title>ScriptaHub auth fixture</title>${transportScript('original')}<script src="/assets/auth.js" defer></script></head><body><h1>ScriptaHub auth fixture</h1><a id="reading" href="/public.html">Read publicly</a><a id="pdf" href="/requested.pdf?edition=current">Download PDF</a><a id="history" href="/historical.pdf?edition=old" target="_blank">Historical PDF</a><a id="feedback" href="/feedback/index.html?book=fixture" data-auth-action="feedback">Suggest An Edit</a>${url.searchParams.has('frame') ? '<iframe src="/frame.html" title="Embedded reader"></iframe>' : ''}</body></html>`);
            return;
        }
        if (url.pathname === '/public.html') {
            response.setHeader('content-type', 'text/html');
            response.end('<!doctype html><title>Public reading</title><h1>Public reading</h1>');
            return;
        }
        if (url.pathname === '/feedback/index.html') {
            response.setHeader('content-type', 'text/html');
            response.end(`<!doctype html><html lang="en"><head><title>Feedback fixture</title>${transportScript('original')}<script src="/assets/auth.js" defer></script><script src="/fixture/book.js"></script><script src="/assets/workflow.js" defer></script></head><body data-workflow-page="feedback"><main data-workflow-content></main></body></html>`);
            return;
        }
        if (url.pathname === '/fixture/book.js') {
            response.setHeader('content-type', 'text/javascript');
            response.end(`window.SCRIPTA_COLLECTION={supportedLanguages:[{code:'en',name:'English'}],books:[{id:'fixture',directory:'fixture',title:{en:'Fixture book'},shortDescription:{en:'Fixture description'},thumbnailUrl:{en:'cover.webp'},editions:{en:{book:'book.html'}}}]};`);
            return;
        }
        if (!/^\/(?:assets\/[A-Za-z0-9.-]+|auth\/callback\.html)$/.test(url.pathname)) { response.writeHead(404); response.end(); return; }
        const file = new URL(`../../docs${url.pathname}`, import.meta.url);
        response.setHeader('content-type', url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html');
        let content = await readFile(file);
        if (url.pathname === '/auth/callback.html') content = content.toString().replace('<head>', `<head>${transportScript('callback')}`);
        response.end(content);
    } catch (error) { response.writeHead(500); response.end(error.message); }
});
await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve));
const siteOrigin = `http://127.0.0.1:${site.address().port}`;
config.callback = `${siteOrigin}/auth/callback.html`;
provider = controlledProvider(config);
console.log(JSON.stringify({ site: siteOrigin, issuer: config.issuer, pid: process.pid }));
function stop() {
    for (const hold of holds.values()) hold.resolve();
    site.closeAllConnections();
    providerServer.closeAllConnections();
    site.close();
    providerServer.close();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
