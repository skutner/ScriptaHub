# Dependencies

## Scope and policy

This inventory covers ScriptaHub tools, tests, browser code, vendored data, and
optional maintenance features. Native catalogue tools and tests use Node.js
built-ins with no npm dependencies. The browser build retains its existing
packages. Keyword inference and image encoding retain specialized tools because
Node.js built-ins do not provide equivalent models or codecs.

The Node.js migration and four-space formatting were explicitly requested.
Existing browser, NLP, and image dependencies are inherited project decisions;
no packages or global tools were installed during migration. New vendored HTML
entity data replaces Python's standard-library table without adding a parser
package. Existing unpinned optional resources are identified below, not treated
as newly approved or fully reproducible dependencies.

## Runtime prerequisites

Node.js **22.12.0 or newer** supplies ESM, filesystem operations, `fetch`,
`node:test`, Web Crypto, and JSON source/raw-number support. Install an official
supported release from [nodejs.org](https://nodejs.org/en/download). The CLI
checks its version through `tools/lib/runtime.mjs` before work and names the
required version and this file on failure. Module-relative paths allow use from
another working directory. npm is needed only to install/build the browser
dependencies. Node.js and npm are environment prerequisites, not vendored tools;
their installed notices remain with the selected distribution.

Python **3.10 or newer** is optional, used only by `tools/keywords/local_nlp.py`.
Set `SCRIPTAHUB_KEYWORD_PYTHON` to a project virtual environment's interpreter.
Node checks the interpreter launch; the worker checks its version, packages and
NLTK data. Imports additionally verify the three cached Marian models before
moving files. Normal refresh, validation, link audits, and tests never launch
Python. Python comes from an operator-selected distribution under its bundled
PSF and component notices; it is not redistributed here.

## Browser build dependencies

These versions are pinned by `package-lock.json`, installed locally by `npm ci`,
and unchanged by the migration. All packages in this table use the MIT license;
retain their copyright and permission notices in redistributed copies. There
are no local package patches. `build:auth` checks all four versions, reads the
redistributed licenses, imports esbuild and probes its platform binary before
writing output. Missing or incompatible packages produce a nonzero error
directing the operator to `npm ci` and this file.

| Package | Version and location | Purpose, source and update |
| --- | --- | --- |
| esbuild | 0.28.2, `node_modules/esbuild`; license `LICENSE.md` | Existing build tool for browser ESM dependencies. [Source/releases](https://github.com/evanw/esbuild). Built-ins do not bundle this dependency graph; replacing it requires changing browser delivery. |
| @esbuild/* | 26 optional platform package entries, each 0.28.2 in the lock; one matching binary is installed | Transitive esbuild binaries, same upstream and MIT license. `@esbuild/darwin-arm64` was selected on the verification host. Other platforms resolve their own lock entry during `npm ci`. No local compilation is required. |
| openid-client | 6.8.7, `node_modules/openid-client`; license `LICENSE.md` | Existing OIDC/PKCE client. [Source/releases](https://github.com/panva/openid-client). A handwritten protocol client would expand authentication risk. Depends on the next two packages. |
| jose | 6.2.12, `node_modules/jose`; license `LICENSE.md` | Transitive JOSE/JWT implementation. [Source/releases](https://github.com/panva/jose). No further runtime package dependencies. Retained for openid-client. |
| oauth4webapi | 3.8.8, `node_modules/oauth4webapi`; license `LICENSE.md` | Transitive OAuth protocol implementation. [Source/releases](https://github.com/panva/oauth4webapi). No further runtime package dependencies. Retained for openid-client. |

The three browser package licenses are copied to `docs/assets/licenses/` by
`build:auth`. esbuild is a build dependency and is not included in the browser
bundle. To update, select explicit upstream versions, update the manifest and
lock together, update the build's version checks and this table, run `npm ci`,
`npm run build`, and `npm test`, then review bundle and license changes. Do not
remove transitive packages while the OIDC client requires them. A reviewed
replacement of that client or browser distribution is the removal opportunity.

## Bundled HTML and Unicode data

`external/html-entities/entities.json` contains 2,231 named references from the
[WHATWG HTML Standard](https://html.spec.whatwg.org/entities.json), fetched on
2026-09-09. SHA-256:
`d741d877ac77c4194c4ad526b5b4a19aef8dfe411ab840a466891cdbb9f362e6`.
The unchanged table replaces Python `html.unescape`; a partial handwritten
entity list would change link/anchor behavior. It has no build or transitive
requirements and is required by the link auditor and HTML text maintenance.

`external/html-entities/LICENSE` is the corresponding WHATWG license text,
SHA-256 `85dc6f5ccb57a6fe8c33d158f9fc8fc7ee5655a5d3db2cdd131c6a3d0f48a864`.
It specifies **CC-BY-4.0**, with a **BSD-3-Clause** option for portions incorporated
into source code. Preserve the bundled attribution and license. See the local
README for source/license URLs and the checksum-based update procedure. There
are no local data modifications. Resource loading fails before writes if the
file is absent; restore the tracked `external/html-entities/` directory. Removal
would require another complete, compatible HTML entity implementation.

`tools/lib/casefold-overrides.json` is project-generated compatibility data:
1,557 non-identity mappings observed from CPython 3.14.3 / Unicode 16.0.0 by
iterating all code points and recording `str.casefold()`. It is not copied
Unicode source. No Python or Unicode download is needed at runtime. Its embedded
provenance describes regeneration; retain the generation version and rerun
Unicode and output-parity tests on updates. Using Node's native lowercase alone
would differ across Unicode versions. `book-page-copy.json` and
`keywords/vocabulary.json` are project-owned data extracted from the former
generator, not third-party dependencies.

## Optional cover conversion

`refresh-covers`, legacy `build`, and cover recovery require **ImageMagick 6 or
7 with WebP write support**. `magick` is preferred; `convert` supports version 6.
The CLI probes `-version` and `-list format` with bounded subprocesses before
output. Missing capability exits nonzero with the required version and a link
to this file. PNG source art remains unchanged. Commands no longer substitute
PNG bytes for failed WebP conversion.

ImageMagick is inherited, installed on PATH by the operator, not bundled. See
[source and releases](https://github.com/ImageMagick/ImageMagick), the official
[installation instructions](https://imagemagick.org/script/download.php), and
[license](https://imagemagick.org/script/license.php). Its ImageMagick license is
permissive; codec/delegate notices belong to the selected distribution. Exact
installed release, codec versions, and their licenses are unresolved until the
operator selects a distribution. No ImageMagick is installed on the migration
host. On macOS an operator can use `brew install imagemagick`; on Debian/Ubuntu,
`sudo apt-get install imagemagick`. These are explicit environment changes,
never startup actions. Verify WebP write support after installation.

Native Node.js lacks image decoding, trimming, and WebP encoding. A custom
codec is not a maintainable substitute; another image package would add its own
native dependencies. Updating follows the selected package manager, then tests
real cover dimensions and output format. A reviewed equivalent codec workflow
would allow removal. No ImageMagick code or binaries are redistributed here.

## Optional local keyword extraction and translation

Only `rebuild-keywords` and legacy `build` select the Python worker. Node owns
catalogue/cache writes; the worker exchanges JSON over stdin/stdout and does
not write catalogue files. Extraction preserves the existing NLTK noun-phrase
ranking. Translation preserves local PyTorch Marian inference. Built-ins lack
trained POS tagging and tensor/model execution; a homemade heuristic would
change the required 90 source-derived keywords and their translations.

| Component | Required range or resource | Source/license status |
| --- | --- | --- |
| NLTK | `>=3.10,<4` | [Upstream](https://github.com/nltk/nltk), Apache-2.0 upstream license. Exact selected release unresolved. |
| sentencepiece | `>=0.2,<1` | [Upstream](https://github.com/google/sentencepiece), Apache-2.0 upstream license. Exact selected release unresolved. |
| PyTorch | `>=2.0` | [Upstream](https://github.com/pytorch/pytorch), BSD-style license plus bundled component notices. Exact selected release and native libraries unresolved. |
| Transformers | `>=4.50,<5` | [Upstream](https://github.com/huggingface/transformers), Apache-2.0 upstream license. Exact selected release unresolved. |
| NLTK data | `punkt_tab/english`, `averaged_perceptron_tagger_eng` | [Data index](https://github.com/nltk/nltk_data). Existing unpinned resources; exact revisions and resource-specific notices unresolved. |
| Marian ROMANCE model | `Helsinki-NLP/opus-mt-en-ROMANCE` | [Model card](https://huggingface.co/Helsinki-NLP/opus-mt-en-ROMANCE), current card Apache-2.0; cached revision unresolved. French, Spanish, Portuguese, Italian, Romanian. |
| Marian German model | `Helsinki-NLP/opus-mt-en-de` | [Model card](https://huggingface.co/Helsinki-NLP/opus-mt-en-de), current card CC-BY-4.0; cached revision unresolved. Retain attribution if distributing model material. |
| Marian Polish model | `Helsinki-NLP/opus-mt-en-zlw` | [Model card](https://huggingface.co/Helsinki-NLP/opus-mt-en-zlw). Exact revision and license unresolved; verify before obtaining or redistributing a new snapshot. |

The ranges in `tools/requirements-keywords.txt` are inherited, not a resolved
lock. No NLP packages are installed in the host Python used for migration.
Exact transitive dependencies, platform wheels, licenses and notices therefore
remain unresolved. This file does not claim that a new NLP environment is
locked or approved for redistribution. Capture a platform-specific resolution
and its notices when provisioning; the current models and environments are
not bundled in the repository. Retain upstream license/NOTICE files when
copying packages or models. Any newly selected unknown-license resource must
be resolved before acceptance.

Provision packages explicitly in a project environment using a supported
Python distribution with available PyTorch wheels:

```sh
python3 -m venv .venv-keywords
.venv-keywords/bin/python -m pip install -r tools/requirements-keywords.txt
export SCRIPTAHUB_KEYWORD_PYTHON="$PWD/.venv-keywords/bin/python"
```

Provision the two named NLTK data resources through the official NLTK downloader,
and review each model card/license before separately obtaining a chosen revision
from Hugging Face. Keep the three compatible tokenizer/model snapshots in the
Hugging Face cache used by that environment. Record selected revisions and
resolved package versions before relying on reproducibility. Downloads and
large installs are operator setup steps; these commands do not run them for you.

The worker checks package versions and data availability when selected. Model
loads use `local_files_only=True`; missing models raise an actionable error.
`build` probes all three models before moving legacy files. `rebuild-keywords`
can reuse a complete phrase translation cache without loading models; when
phrases are missing it loads the necessary local models. It prepares all
translations and validates keyword counts before saving manifests or cache.
The cache remains `tools/keyword-translations.generated.json` and contains no
model weights. Updating packages, data or models requires representative
keyword-quality review in all eight languages and catalogue/link tests.
The dependency can be removed only if keyword metadata is curated separately
or an equivalent local inference implementation is deliberately adopted.

## Existing optional browser/CDN resources

`docs/reader/reader.js` loads these resources only for the selected reader
feature. They remain external URLs, with no new vendoring or local changes.
Browser loading is their availability check; failures surface through the
existing reader error handling. They are not needed for catalogue generation.

| Resource | Pinned URL version and license | Transitive requirements and removal opportunity |
| --- | --- | --- |
| PDF.js and worker | cdnjs, **4.10.38**, [Apache-2.0 license](https://github.com/mozilla/pdf.js/blob/v4.10.38/LICENSE) | Existing PDF rendering; keep library/worker versions aligned. Tagged package has no production npm dependency graph. Built-ins cannot render PDF pages to this reader. |
| JSZip | jsDelivr, **3.10.1**, [MIT or GPL-3.0 choice](https://github.com/Stuk/jszip/blob/v3.10.1/LICENSE.markdown); use MIT | Existing EPUB ZIP support. Declared dependencies: lie `~3.3.0`, pako `~1.0.2`, readable-stream `~2.3.6`, setimmediate `^1.0.5`. Exact versions/notices in the hosted bundle are not recorded locally. |
| epub.js | jsDelivr, **0.3.93**, [BSD-2-Clause license](https://github.com/futurepress/epub.js/blob/v0.3.93/license) | Existing EPUB reader. Declared dependencies: @types/localforage `0.0.34`, @xmldom/xmldom `^0.7.5`, core-js `^3.18.3`, event-emitter `^0.3.5`, jszip `^3.7.1`, localforage `^1.10.0`, lodash `^4.17.21`, marks-pane `^1.0.9`, path-webpack `0.0.3`. Exact bundled versions/notices are unresolved. |
| Umami hosted script | `https://cloud.umami.is/script.js`, unpinned | Existing reader analytics. [Upstream Umami](https://github.com/umami-software/umami) uses MIT; the hosted script's exact revision/license is unresolved. No local notice or source copy. Removing analytics would remove this dependency. |

To update reader libraries, select exact upstream releases, inspect their
licenses and complete bundled dependency notices, change the URLs in
`docs/reader/reader.js`, and test the corresponding PDF/EPUB feature in a browser.
Preserve notices if vendoring later. Removing PDF/EPUB support or adopting a
reviewed equivalent reader is the removal opportunity for their libraries.
These existing CDN provenance gaps remain separate from the Node.js migration;
no claim is made that externally hosted bundles are reproducible or locally
licensed in full. Umami updates are controlled by its hosting provider.

## Verification

Run `npm run build` and `npm test`. Native tests compare all 808 book pages with
published bytes, preserve edition history and numeric metadata, check symlink
boundaries and missing dependencies, and exercise imports/recovery using
temporary files and injected NLP/image/HTTP providers. The auditor was compared
with Python on 1,311 HTML inventories and 4,848 entity cases. Copied tools run
from another working directory without an npm or Python environment.

Real model inference and ImageMagick conversion require the optional environment
above; they were not available on the migration host. Mocked orchestration and
failure checks do not establish real model output or codec operation.

## Optional real-browser authentication verification

The new popup/lifecycle code uses native BroadcastChannel, AbortController and
monotonic browser time; it adds no production or build dependency. Existing
openid-client remains responsible for PKCE/OIDC/JOSE rather than a handwritten
security protocol. The controlled HTTP fixture and deterministic race tests use
Node.js built-ins only, including RSA signing with `node:crypto`.

The browser scenario files under `tests/browser/` are Playwright CLI functions,
run explicitly with `run-code --filename`; they are not application scripts or
part of `npm test`. Verification used the existing **@playwright/cli 0.1.19**,
with its exact runtime dependencies **playwright 1.63.0-alpha-2026-08-31** and
**playwright-core 1.63.0-alpha-2026-08-31**, and Chrome **152.0.7977.83** in a
separate local session. The CLI accepts Node >=18, its Playwright runtime >=20;
this project still requires Node >=22.12. These packages use **Apache-2.0**;
`LICENSE` and `NOTICE` remain in their installed package directories. The installed
Playwright package depends only on the same exact playwright-core release. Browser binaries
retain their vendor/component notices and are not redistributed by this repo.

Real popup windows, COOP separation, BroadcastChannel delivery and trusted anchor
activation cannot be established by Node or synthetic DOM tests, which justifies
this optional verification dependency under the requested real-browser matrix.
No global installation is required. An operator can use an existing installation
or explicitly run `npx --package @playwright/cli@0.1.19 playwright-cli --version`,
then follow `docs/auth/README.md`. Confirm that version and a selected installed
browser before opening the fixture. Missing CLI/browser errors must be resolved
by the operator; application startup and `npm test` never install either. The
CLI's own missing-browser message gives the supported install command.

Upstream sources and updates are
[Playwright CLI](https://github.com/microsoft/playwright-cli) and
[Playwright](https://github.com/microsoft/playwright). No local patches or bundled
third-party copies were added. Updating requires selecting explicit CLI/runtime
versions, retaining installed notices, and rerunning both browser scenario files
with recorded browser versions. Replacing the CLI with another real-browser
harness could remove this optional dependency; replacing it with synthetic DOM
checks would not meet the popup acceptance requirement.
