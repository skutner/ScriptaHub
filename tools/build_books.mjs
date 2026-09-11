#!/usr/bin/env node
/** Refresh localized book pages and edition history from the existing manifests. */
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNodeVersion } from './lib/runtime.mjs';
import { checkCatalogue } from './check_catalogue.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DOCS = path.join(ROOT, 'docs');
const copyData = JSON.parse(readFileSync(new URL('./lib/book-page-copy.json', import.meta.url), 'utf8'));
const casefoldMapping = JSON.parse(readFileSync(new URL('./lib/casefold-overrides.json', import.meta.url), 'utf8')).mapping;
export const LANGUAGES = Object.freeze(copyData.languages);
const { topics, copy, cloudInstructions, cloudPreviewInstructions, cloudCloseLabels, bookActions, shelfCategories } = copyData;
export const COPY = copy;
export const TOPICS = topics;
export const BOOK_ACTIONS = bookActions;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const isObject = (value) => value !== null && typeof value === 'object' && !JSON.isRawJSON(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const object = isObject;
const relative = (target, start) => path.relative(start, target).split(path.sep).join('/') || '.';
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[character]);
const queryValue = (value) => encodeURIComponent(String(value)).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, '+');
const query = (values) => Object.entries(values).map(([key, value]) => `${queryValue(key)}=${queryValue(value)}`).join('&');

function inlineJson(value) {
    if (Array.isArray(value)) return `[${value.map(inlineJson).join(', ')}]`;
    if (object(value)) return `{${Object.entries(value).map(([key, entry]) => `${JSON.stringify(key)}: ${inlineJson(entry)}`).join(', ')}}`;
    return JSON.stringify(value);
}

function localized(book, field, language) {
    const value = book[field]?.[language];
    if (typeof value !== 'string') throw new Error(`${book.id}: missing ${field}.${language}`);
    return value;
}

function editionFor(book, language) {
    if (!own(LANGUAGES, language)) throw new Error(`Unsupported language: ${language}`);
    const edition = book.editions?.[language];
    if (!object(edition)) throw new Error(`${book.id}: missing ${language} edition`);
    return edition;
}

function shelfIds(group) {
    const labels = shelfCategories[group];
    if (!labels) throw new Error(`Unknown subject group: ${group}`);
    return new Set(labels.map((label) => {
        return keywordIdentifier(label);
    }));
}

export function readerHref(book, language, pagePath, formatName, { docsRoot = DOCS } = {}) {
    const edition = editionFor(book, language);
    const contentKey = formatName === 'short' ? 'shortContent' : 'fullContent';
    if (!own(edition, contentKey)) throw new Error(`${book.id} has no ${formatName} reader edition in ${language}`);
    if (!['short', 'read'].includes(formatName)) throw new Error(`Unsupported reading format: ${formatName}`);
    const readerDirectory = path.join(docsRoot, 'reader');
    const bookDirectory = path.resolve(docsRoot, book.directory);
    const params = {
        id: `${book.id}:${language}:${formatName}`,
        title: `${localized(book, 'title', language)} · ${copy[language][formatName]}`,
        html: relative(path.join(bookDirectory, edition[contentKey]), readerDirectory),
        mode: formatName === 'short' ? 'ten-minute' : 'full',
        back: relative(pagePath, readerDirectory),
        book: book.directory,
        language,
        format: formatName,
    };
    if (own(edition, 'pdf')) params.pdf = relative(path.join(bookDirectory, edition.pdf), readerDirectory);
    return `${relative(path.join(readerDirectory, 'index.html'), path.dirname(pagePath))}?${query(params)}`;
}

function siteFooter(start, language, docsRoot) {
    const legal = relative(path.join(docsRoot, 'legal'), start);
    const links = [
        ['terms.html', 'terms', 'Terms'], ['privacy.html', 'privacy', 'Privacy'],
        ['cookies.html', 'cookies', 'Cookies & local storage'], ['notice.html', 'notice', 'Legal notice'], ['ai.html', 'ai', 'AI transparency'],
    ];
    const navigation = links.map(([page, key, label]) => `<a data-footer-${key} data-legal-link href="${escape(`${legal}/${page}?lang=${language}`)}">${escape(label)}</a>`).join('');
    return `<footer class="site-footer"><a class="footer-wordmark" href="${escape(relative(path.join(docsRoot, 'index.html'), start))}">ScriptaHub.com</a><nav aria-label="Legal">${navigation}</nav><span class="footer-status">© 2026 ScriptaHub</span></footer>`;
}

export function bookPage(book, language, pagePath, hasContent, { docsRoot = DOCS } = {}) {
    const edition = editionFor(book, language);
    const words = copy[language];
    const title = localized(book, 'title', language);
    const subtitle = localized(book, 'subtitle', language);
    const topic = topics[language][book.group];
    if (!topic) throw new Error(`${book.id}: unknown subject group ${book.group}`);
    const description = localized({ ...book, descriptions: book.descriptions || book.shortDescription }, 'descriptions', language).replaceAll('Axiologic Research', 'ScriptaHub');
    const pageDirectory = path.dirname(pagePath);
    const asset = (...segments) => relative(path.join(docsRoot, ...segments), pageDirectory);
    const home = asset('index.html');
    const css = asset('assets', 'site.css');
    const collectionScript = asset('collection.js');
    const siteScript = asset('assets', 'site.js');
    const authScript = asset('assets', 'auth.js');
    const createPage = asset('create', 'index.html');
    const feedbackPage = asset('feedback', 'index.html');
    const editionsPage = asset('editions', 'index.html');
    const languageOptions = Object.entries(LANGUAGES).map(([code, name]) => `<option value="../${code}/book.html"${code === language ? ' selected' : ''}>${escape(name)}</option>`).join('\n');
    const actions = [];
    if (own(edition, 'shortContent')) actions.push(`<a class="button button-quiet" href="${escape(readerHref(book, language, pagePath, 'short', { docsRoot }))}">${escape(words.short)}</a>`);
    if (own(edition, 'fullContent')) actions.push(`<a class="button button-quiet" href="${escape(readerHref(book, language, pagePath, 'read', { docsRoot }))}">${escape(words.read)}</a>`);
    if (own(edition, 'pdf')) actions.push(`<a class="button button-quiet" href="book.pdf" data-auth-action="download">${escape(words.download)}</a>`);
    const workflowQuery = query({ book: book.directory, lang: language });
    actions.push(`<a class="button" href="${escape(`${feedbackPage}?${workflowQuery}`)}" data-auth-action="feedback">${escape(bookActions[language].feedback)}</a>`);
    actions.push(`<a class="button button-quiet" href="${escape(`${editionsPage}?${workflowQuery}`)}">${escape(bookActions[language].editions)}</a>`);
    const available = hasContent ?? (own(edition, 'fullContent') || own(edition, 'shortContent'));
    const availability = available ? '' : `<p class="edition-unavailable">${escape(words.unavailable.replace('{language}', LANGUAGES[language]))}</p>`;
    const identifiers = book.keywordIds;
    const labels = book.keywords?.[language];
    if (!Array.isArray(identifiers) || !Array.isArray(labels) || identifiers.length !== labels.length) throw new Error(`${book.id} ${language}: keyword IDs and labels must have matching lengths`);
    const shelves = shelfIds(book.group);
    const entries = identifiers.map((identifier, rank) => {
        const count = Number(book.keywordStats?.[language]?.[identifier]?.count);
        if (!Number.isSafeInteger(count) || count < 0) throw new Error(`${book.id} ${language}: missing or invalid keyword count for ${identifier}`);
        return { identifier, rank, count, label: String(labels[rank]) };
    });
    const byFrequency = (first, second) => second.count - first.count || first.rank - second.rank;
    const ordered = [entries.filter((entry) => !shelves.has(entry.identifier)).sort(byFrequency), entries.filter((entry) => shelves.has(entry.identifier)).sort(byFrequency)].flat();
    const keywordItems = ordered.map(({ identifier, count, label }) => ({ label, count, href: `${home}?${query({ lang: language, keyword: identifier })}` }));
    const keywordData = inlineJson(keywordItems).replaceAll('</', '<\\/');
    const keywordOptions = inlineJson({ ariaLabel: words.keywords, instruction: cloudPreviewInstructions[language], modalInstruction: cloudInstructions[language], closeLabel: cloudCloseLabels[language], showInstruction: false }).replaceAll('</', '<\\/');
    const cloudScript = asset('assets', 'keyword-cloud.js');
    const themeSwitcher = '<div class="theme-switcher"><button type="button" data-theme-toggle aria-label="Switch to dark appearance">☼</button></div>';
    return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)} · ScriptaHub</title>
  <meta name="description" content="${escape(description)}">
  <meta property="og:type" content="book">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:image" content="cover.webp">
  <link rel="stylesheet" href="${escape(css)}">
  <script defer src="${escape(authScript)}?v=20260911-2"></script>
</head>
<body data-book-page="true" data-book-language="${language}">
  <main class="site-shell book-page">
    <header class="site-header"><a class="wordmark" href="${escape(home)}">ScriptaHub<span>.com</span></a><div class="header-tools"><a class="header-create" data-create-link href="${escape(createPage)}?lang=${language}">${escape(bookActions[language].create)}</a><div class="site-scale" aria-label="Site text size"><button type="button" data-site-smaller aria-label="Decrease site size">A−</button><button type="button" data-site-size aria-label="Reset site size">100%</button><button type="button" data-site-larger aria-label="Increase site size">A+</button></div>${themeSwitcher}<label class="language-picker"><span class="sr-only">Language</span><select onchange="location.href=this.value">${languageOptions}</select></label></div></header>
    <article class="book-hero">
      <a class="cover-link" href="cover.webp"><img src="cover.webp" alt="${escape(title)} cover"></a>
      <div class="book-details"><div class="book-copy"><p class="eyebrow">${escape(topic)} · ScriptaHub</p><h1>${escape(title)}</h1><p class="book-subtitle">${escape(subtitle)}</p><p class="lead">${escape(description)}</p></div><div class="book-actions">${actions.join('')}</div>${availability}</div>
      <aside class="book-keyword-widget" aria-label="${escape(words.keywords)}"><div class="keyword-cloud book-keyword-cloud" data-book-keyword-cloud></div></aside>
    </article>
    <section class="book-introduction"><div><p class="eyebrow">ScriptaHub</p><h2>${escape(words.read)}</h2><p>${escape(words.presentation)}</p></div></section>${siteFooter(pageDirectory, language, docsRoot)}
  </main>
  <script src="${escape(cloudScript)}"></script><script>globalThis.ScriptaKeywordCloud.mount(document.querySelector('[data-book-keyword-cloud]'), ${keywordData}, ${keywordOptions});</script><script src="${escape(collectionScript)}"></script><script src="${escape(siteScript)}"></script>
</body>
</html>
`;
}

export function contained(candidate, boundary) {
    const rel = path.relative(boundary, candidate);
    return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

/** Resolve existing symlinks while allowing an asset that has not been written yet. */
export function resolveAssetPath(filename, links = new Set()) {
    const absolute = path.isAbsolute(filename) ? filename : `${process.cwd()}${path.sep}${filename}`;
    const root = path.parse(absolute).root;
    let current = root;
    const parts = absolute.slice(root.length).split(path.sep);
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') {
            current = path.dirname(current);
            continue;
        }
        current = path.join(current, part);
        let stat;
        try {
            stat = lstatSync(current);
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
                continue;
            }
            throw error;
        }
        if (stat.isSymbolicLink()) {
            if (links.has(current)) throw new Error(`Symlink loop: ${current}`);
            const visited = new Set(links).add(current);
            const linked = readlinkSync(current);
            const target = path.isAbsolute(linked) ? linked : `${path.dirname(current)}${path.sep}${linked}`;
            current = resolveAssetPath(target, visited);
        }
    }
    return current;
}

export function relativeAsset(value, bookRoot) {
    if (typeof value !== 'string' || !value || path.isAbsolute(value) || value.includes('\\') || value.split('/').some((part) => part === '..' || part === '')) {
        throw new Error(`Unsafe relative asset path: ${value}`);
    }
    const target = path.resolve(bookRoot, value);
    if (!contained(resolveAssetPath(target), resolveAssetPath(bookRoot))) {
        throw new Error(`Unsafe relative asset path: ${value}`);
    }
    return target;
}

export function readUtf8(filename) {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(filename));
}

/** Keep unknown numeric metadata exact, and distinguish integer schema fields from floats. */
export function parseJson(content) {
    return JSON.parse(content, (key, value, context) => {
        if (typeof value === 'number' && (!Number.isSafeInteger(value) || /[.eE]/.test(context.source))) {
            return JSON.rawJSON(context.source);
        }
        return value;
    });
}

export function readJson(filename) {
    try { return parseJson(readUtf8(filename)); }
    catch (error) { throw new Error(`Cannot read valid JSON from ${filename}: ${error.message}`, { cause: error }); }
}

export function pathExists(filename) {
    try { lstatSync(filename); return true; }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false; throw error; }
}

export function isFile(filename) {
    try { return statSync(filename).isFile(); }
    catch { return false; }
}

export function validateOutput(filename, boundary) {
    if (!contained(path.resolve(filename), path.resolve(boundary)) || !contained(realpathSync(path.dirname(filename)), realpathSync(boundary))) throw new Error(`Refusing output outside book directory: ${filename}`);
    if (pathExists(filename)) {
        const stat = lstatSync(filename);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing non-file output: ${filename}`);
    }
}

function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateHistory(payload, manifest, bookRoot, filename = path.join(bookRoot, 'editions.json')) {
    const invalid = () => { throw new Error(`Malformed existing edition history: ${filename}`); };
    if (!object(payload) || payload.schemaVersion !== 1 || payload.bookId !== manifest.id || typeof payload.currentEdition !== 'string' || !payload.currentEdition || !Array.isArray(payload.editions) || !payload.editions.length) invalid();
    const ids = new Set();
    for (const entry of payload.editions) {
        if (!object(entry) || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !Number.isSafeInteger(entry.number) || entry.number < 1 || !validDate(entry.publishedAt) || !object(entry.changes) || Object.values(entry.changes).some((value) => typeof value !== 'string')) invalid();
        ids.add(entry.id);
        if (own(entry, 'label') && (!object(entry.label) || Object.values(entry.label).some((value) => typeof value !== 'string'))) invalid();
        if (own(entry, 'pdf')) {
            if (!object(entry.pdf)) invalid();
            for (const asset of Object.values(entry.pdf)) relativeAsset(asset, bookRoot, filename);
        }
    }
    if (!ids.has(payload.currentEdition)) invalid();
}

/** Prepare a history update without touching existing files or edition records. */
export function prepareEditionsFile(bookRoot, manifest) {
    bookRoot = path.resolve(bookRoot);
    const filename = path.join(bookRoot, 'editions.json');
    validateOutput(filename, bookRoot);
    if (typeof manifest.id !== 'string' || !manifest.id) throw new Error(`${bookRoot}: missing manifest ID`);
    const existing = existsSync(filename) ? readUtf8(filename) : null;
    let payload;
    if (existing !== null) {
        try { payload = parseJson(existing); }
        catch (error) { throw new Error(`Malformed existing edition history: ${filename}`, { cause: error }); }
        validateHistory(payload, manifest, bookRoot, filename);
    } else {
        const manifestPath = path.join(bookRoot, 'manifest.json');
        const date = isFile(manifestPath) ? statSync(manifestPath).mtime : new Date();
        payload = {
            schemaVersion: 1,
            bookId: manifest.id,
            currentEdition: 'edition-1',
            editions: [{
                id: 'edition-1', number: 1,
                label: Object.fromEntries(Object.keys(LANGUAGES).map((language) => [language, bookActions[language].editionLabel])),
                publishedAt: date.toISOString().slice(0, 10),
                changes: Object.fromEntries(Object.keys(LANGUAGES).map((language) => [language, bookActions[language].initial])),
                pdf: {},
            }],
        };
    }
    const before = JSON.stringify(payload);
    const current = payload.editions.find((entry) => entry.id === payload.currentEdition);
    if (!own(current, 'pdf')) current.pdf = {};
    const editions = own(manifest, 'editions') ? manifest.editions : {};
    if (!object(editions)) throw new Error(`Missing manifest editions: ${bookRoot}`);
    for (const [language, edition] of Object.entries(editions)) {
        if (object(edition) && edition.pdf && !own(current.pdf, language)) {
            relativeAsset(edition.pdf, bookRoot, `${manifest.id} ${language}`);
            Object.defineProperty(current.pdf, language, { value: edition.pdf, enumerable: true, configurable: true, writable: true });
        }
    }
    const content = existing !== null && before === JSON.stringify(payload) ? existing : `${JSON.stringify(payload, null, 2)}\n`;
    return { path: filename, content, kind: 'editions', changed: existing !== content };
}

export function writeOutput(output) {
    if (!output.changed) return;
    const temporary = `${output.path}.tmp-${randomUUID()}`;
    let created = false;
    try {
        const descriptor = openSync(temporary, 'wx');
        created = true;
        try {
            writeFileSync(descriptor, output.content, 'utf8');
        } finally {
            closeSync(descriptor);
        }
        renameSync(temporary, output.path);
    } finally {
        if (created && existsSync(temporary)) rmSync(temporary);
    }
}

export function ensureEditionsFile(bookRoot, manifest) {
    const output = prepareEditionsFile(bookRoot, manifest);
    writeOutput(output);
    return output;
}

/** Validate every input and output before a refresh writes any generated file. */
export function planRefresh({ docsRoot = DOCS } = {}) {
    docsRoot = realpathSync(docsRoot);
    if (pathExists(path.join(docsRoot, 'keywords'))) throw new Error('Legacy docs/keywords exists; refresh will not delete it. Discovery must use the catalogue filter.');
    const booksRoot = realpathSync(path.join(docsRoot, 'books'));
    if (!contained(booksRoot, docsRoot)) throw new Error('Book directory escapes the documentation root');
    const collection = readJson(path.join(docsRoot, 'collection.json'));
    if (!object(collection) || !Array.isArray(collection.books)) throw new Error('Collection books must be an array');
    const keywordStats = Object.fromEntries(Object.keys(LANGUAGES).map((language) => {
        if (!Array.isArray(collection.keywords?.[language])) throw new Error(`Collection is missing ${language} keywords`);
        const stats = Object.create(null);
        for (const keyword of collection.keywords[language]) {
            if (!object(keyword) || typeof keyword.id !== 'string' || !keyword.id || own(stats, keyword.id) || !Number.isSafeInteger(keyword.count) || keyword.count < 0) {
                throw new Error(`Collection has invalid ${language} keywords`);
            }
            stats[keyword.id] = { count: keyword.count };
        }
        return [language, stats];
    }));
    const directories = new Set();
    const files = [];
    for (const listing of collection.books) {
        if (!object(listing) || typeof listing.directory !== 'string' || !listing.directory.startsWith('books/') || listing.directory.includes('\\') || listing.directory.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe book directory: ${listing?.directory}`);
        const bookRoot = path.resolve(docsRoot, listing.directory);
        const actualRoot = realpathSync(bookRoot);
        if (!contained(actualRoot, booksRoot) || actualRoot === booksRoot || directories.has(actualRoot)) throw new Error(`Unsafe or duplicate book directory: ${listing.directory}`);
        directories.add(actualRoot);
        const manifest = readJson(relativeAsset('manifest.json', bookRoot));
        if (!object(manifest) || manifest.id !== listing.id) throw new Error(`Manifest ID does not match collection: ${listing.directory}`);
        files.push(prepareEditionsFile(bookRoot, manifest));
        const book = { ...manifest, directory: listing.directory, descriptions: manifest.shortDescription, keywordStats };
        for (const language of Object.keys(LANGUAGES)) {
            for (const field of ['title', 'subtitle', 'shortDescription']) {
                if (!object(manifest[field]) || typeof manifest[field][language] !== 'string') {
                    throw new Error(`${manifest.id}: missing ${field}.${language}`);
                }
            }
            const edition = editionFor(book, language);
            for (const value of Object.values(edition)) relativeAsset(value, bookRoot, `${manifest.id} ${language}`);
            const filename = path.join(bookRoot, language, 'book.html');
            validateOutput(filename, bookRoot);
            const content = bookPage(book, language, filename, own(edition, 'fullContent') || own(edition, 'shortContent'), { docsRoot });
            const existing = existsSync(filename) ? readFileSync(filename) : null;
            files.push({ path: filename, content, kind: 'page', changed: existing === null || !Buffer.from(content).equals(existing) });
        }
    }
    return { books: collection.books.length, pages: collection.books.length * Object.keys(LANGUAGES).length, files };
}

export function refreshPages({ docsRoot = DOCS, write = true } = {}) {
    const plan = planRefresh({ docsRoot });
    if (write) for (const output of plan.files) writeOutput(output);
    return { books: plan.books, pages: plan.pages, changedFiles: plan.files.filter((output) => output.changed).length };
}

export function casefold(value) {
    // Preserve the former generator's Unicode 16 case folding for labels and IDs.
    return [...String(value)].map(character => casefoldMapping[character] ?? character).join('');
}

export function slugify(value) {
    return String(value).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'keyword';
}

export function keywordNormalise(value) {
    const normalized = casefold(value).normalize('NFKD').replace(/[^\x00-\x7f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
    return ` ${normalized} `;
}

export function keywordIdentifier(label) {
    return `term:${createHash('sha256').update(keywordNormalise(label).trim()).digest('hex').slice(0, 20)}`;
}

export function titleRoute(title) {
    return slugify(title).split('-');
}

export function editionRecord(bookRoot, language) {
    const folder = path.join(bookRoot, language);
    const cover = isFile(path.join(folder, 'cover.webp')) ? 'cover.webp' : 'cover.png';
    const record = {
        book: `${language}/book.html`,
        cover: `${language}/${cover}`,
        sourceCover: `${language}/cover.png`,
        thumbnail: `${language}/thumbnail.webp`,
    };
    for (const [filename, key] of [['full_content.html', 'fullContent'], ['short_content.html', 'shortContent'], ['book.pdf', 'pdf']]) {
        if (isFile(path.join(folder, filename))) record[key] = `${language}/${filename}`;
    }
    return record;
}

/** Enumerate owned source records without following linked directories. */
export function manifestsUnder(root) {
    try {
        if (!statSync(root).isDirectory()) return [];
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return [];
        throw error;
    }
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const target = path.join(root, entry.name);
        if (entry.isDirectory()) files.push(...manifestsUnder(target));
        else if (entry.name === 'manifest.json') files.push(target);
    }
    return files.sort();
}

export function makeCollection(manifests) {
    const keywordCounts = Object.fromEntries(Object.keys(LANGUAGES).map(language => [language, new Map()]));
    const books = [];
    for (const manifest of manifests) {
        const directory = manifest.directory;
        const prefix = entries => Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, `${directory}/${value}`]));
        const editions = Object.fromEntries(Object.entries(manifest.editions).map(([language, edition]) => [language, prefix(edition)]));
        books.push({
            id: manifest.id, sourceId: manifest.sourceId, directory, route: manifest.route,
            category: manifest.category, group: manifest.group, title: manifest.title, subtitle: manifest.subtitle,
            shortDescription: manifest.shortDescription, keywords: manifest.keywords, keywordIds: manifest.keywordIds,
            coverUrl: prefix(manifest.coverUrl), thumbnailUrl: prefix(manifest.thumbnailUrl),
            editions, availableLanguages: manifest.availableLanguages,
        });
        for (const language of Object.keys(LANGUAGES)) {
            const labels = manifest.keywords[language];
            if (!Array.isArray(labels) || !Array.isArray(manifest.keywordIds) || labels.length !== manifest.keywordIds.length) {
                throw new Error(`${manifest.id} ${language}: keyword IDs and labels must have matching lengths`);
            }
            for (let index = 0; index < labels.length; index++) {
                const id = manifest.keywordIds[index];
                const label = labels[index];
                if (!keywordCounts[language].has(id)) keywordCounts[language].set(id, { id, label, slug: slugify(label), count: 0 });
                keywordCounts[language].get(id).count++;
            }
        }
    }
    const keywords = {};
    const compare = (first, second) => {
        const left = [...first];
        const right = [...second];
        for (let index = 0; index < Math.min(left.length, right.length); index++) {
            const difference = left[index].codePointAt(0) - right[index].codePointAt(0);
            if (difference) return difference;
        }
        return left.length - right.length;
    };
    for (const [language, entries] of Object.entries(keywordCounts)) {
        const usedSlugs = new Set();
        const words = [...entries.values()].sort((first, second) => second.count - first.count
            || compare(casefold(first.label), casefold(second.label)) || compare(first.id, second.id));
        for (const entry of words) {
            if (usedSlugs.has(entry.slug)) entry.slug += `--${slugify(entry.id)}`;
            usedSlugs.add(entry.slug);
        }
        keywords[language] = words;
    }
    return {
        schemaVersion: 1,
        supportedLanguages: Object.entries(LANGUAGES).map(([code, name]) => ({ code, name })),
        bookCount: books.length,
        books,
        keywords,
    };
}

export function rebuildCollectionFromManifests({ docsRoot = DOCS } = {}) {
    docsRoot = path.resolve(docsRoot);
    const manifests = manifestsUnder(path.join(docsRoot, 'books')).map(filename => ({
        ...readJson(filename), directory: relative(path.dirname(filename), docsRoot),
    }));
    const collection = makeCollection(manifests);
    writeFileSync(path.join(docsRoot, 'collection.json'), `${JSON.stringify(collection, null, 2)}\n`);
    writeFileSync(path.join(docsRoot, 'collection.js'), `globalThis.SCRIPTA_COLLECTION = ${JSON.stringify(collection)};\n`);
    return collection;
}

export function check({ docsRoot = DOCS } = {}) {
    return checkCatalogue(docsRoot);
}

export function createBookTools({ docs = DOCS } = {}) {
    const docsRoot = path.resolve(docs);
    const options = { docsRoot };
    return {
        root: ROOT, docs: docsRoot, books: path.join(docsRoot, 'books'),
        collection: path.join(docsRoot, 'collection.json'), collectionScript: path.join(docsRoot, 'collection.js'),
        bookPage: (book, language, page, hasContent) => bookPage(book, language, page, hasContent, options),
        readerHref: (book, language, page, format) => readerHref(book, language, page, format, options),
        prepareEditionsFile, ensureEditionsFile, makeCollection,
        planRefresh: () => planRefresh(options),
        refreshPages: (settings = {}) => refreshPages({ ...settings, ...options }),
        rebuildCollectionFromManifests: () => rebuildCollectionFromManifests(options),
        check: () => checkCatalogue(docsRoot),
    };
}

export async function main(argv = process.argv.slice(2)) {
    assertNodeVersion(process.versions.node, 'ScriptaHub book tools');
    const commands = ['build', 'reorganize-routes', 'rebuild-keywords', 'refresh-covers', 'enrich', 'recover', 'recover-editorial-descriptions', 'rebrand', 'retire-source', 'repair-reader-links', 'refresh', 'check'];
    if (argv.length === 1 && ['-h', '--help'].includes(argv[0])) {
        console.log(`Usage: node tools/build_books.mjs <${commands.join('|')}> [--source PATH] [--docs PATH] [--dry-run]`);
        return 0;
    }
    const command = argv[0];
    const usageError = message => {
        console.error(message);
        return 2;
    };
    if (!commands.includes(command)) return usageError(`Expected a book tool command: ${commands.join(', ')}`);
    let docsRoot = DOCS;
    let sourceRoot = path.join(ROOT, 'old_content');
    let dryRun = false;
    let customDocs = false;
    for (let index = 1; index < argv.length; index++) {
        if (argv[index] === '--dry-run') dryRun = true;
        else if (argv[index] === '--docs' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
            docsRoot = path.resolve(argv[++index]);
            customDocs = true;
        } else if (argv[index] === '--source' && argv[index + 1] && !argv[index + 1].startsWith('--')) sourceRoot = path.resolve(argv[++index]);
        else return usageError(`Unknown or incomplete option: ${argv[index]}`);
    }
    if (customDocs && !['refresh', 'check'].includes(command)) return usageError('--docs is only supported by refresh and check');
    if (dryRun && command !== 'refresh') return usageError('--dry-run is only supported by refresh');
    const tools = createBookTools({ docs: docsRoot });
    if (!['refresh', 'check'].includes(command)) {
        const { runMaintenance } = await import('./lib/book-maintenance.mjs');
        return runMaintenance(command, { sourceRoot, docsRoot, tools });
    }
    let result;
    if (command === 'refresh') {
        try {
            result = tools.refreshPages({ write: !dryRun });
        } catch (error) {
            console.error(`Unable to refresh catalogue: ${error.message}`);
            return 1;
        }
        if (dryRun) {
            console.log(`Would refresh ${result.books} book roots (${result.pages} pages, ${result.changedFiles} changed files).`);
            return 0;
        }
    }
    const problems = tools.check();
    if (problems.length) {
        console.error(problems.join('\n'));
        return 1;
    }
    console.log(command === 'check' ? 'ScriptaHub collection is valid.'
        : `Refreshed ${result.books} book roots (${result.pages} pages, ${result.changedFiles} changed files); keyword discovery remains client-side.`);
    return 0;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then((result) => { if (typeof result === 'number') process.exitCode = result; }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
