# ScriptaHub

This fork publishes the `user-persisto-v2` preview at
<https://skutner.github.io/ScriptaHub/>. Its account service runs on the visitor's
own computer. See [PREVIEW.md](PREVIEW.md) for local Explorer setup and testing.
The production site remains in `Axiologic/ScriptaHub`.

Public repository for scriptahub.com. GitHub Pages serves the prebuilt site from
`docs/`. Reader account configuration is in [docs/auth/README.md](docs/auth/README.md).
Product rules are in [DS-001](docs/specs/DS-001-site-product-rules.md); tooling
conventions are in [DS001](docs/specs/DS001-coding-style.md).

## Build and test

Use Node.js 22.12 or newer. The generator, catalogue checker, link auditor, and
their tests use native Node.js modules with four-space indentation. Their normal
commands need no npm packages or Python:

```sh
node tools/build_books.mjs refresh
node tools/build_books.mjs check
node tools/audit_internal_links.mjs --check
```

Install the existing pinned browser build dependencies to run the full workflow:

```sh
npm ci
npm run build
npm test
```

`build:auth` bundles the browser account flow. `build:books` renders book pages
and initializes missing edition history without replacing existing history.
`npm test` runs browser-logic and native tool tests, then validates the catalogue,
edition assets, local links, and fragment anchors. The normal build preserves
canonical reader HTML, PDFs, and existing metadata.

The CLI resolves its default paths from its own location. `refresh` supports
`--dry-run`; `refresh` and `check` accept `--docs PATH`. The standalone link auditor
accepts `--root PATH`. Use `--help` for the complete command syntax.

## Optional maintenance

The same Node.js CLI retains `build`, `recover`, `enrich`, `refresh-covers`,
`rebrand`, `rebuild-keywords`, `reorganize-routes`, `repair-reader-links`,
`recover-editorial-descriptions`, and `retire-source`. Import and recovery read
the repository's `old_content/`; they are unnecessary for ordinary builds.
These commands can move or replace source assets, so review their changes before
publishing. `retire-source` removes processed legacy files only after validation.

Keyword extraction and local translation retain a small Python worker using
NLTK, PyTorch, and Marian models. Reimplementing trained NLP and tensor inference
with Node.js built-ins would not preserve results. Cover conversion retains
ImageMagick. Neither is required for ordinary builds or tests. Prepare these
optional dependencies explicitly using [dependencies.md](dependencies.md);
commands never install packages or download models on startup. Missing cover
tools now produce an error instead of copying a PNG into a `.webp` filename.

The old `docs/content/tools/` translation programs were already absent. The
[book-reader-translations skill](.agents/skills/book-reader-translations/SKILL.md)
describes the current reader layout and manual chunk review without referring
to those unavailable commands.
