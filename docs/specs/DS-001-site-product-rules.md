---
title: DS-001-site-product-rules
summary: Defines ScriptaHub public reading, discovery, retained account actions, catalogue routes, workflows, and presentation rules.
---

## Introduction

These active product rules govern ScriptaHub catalogue, discovery, book pages,
readers, account actions, workflows, legal pages, and shared presentation. They
are an internal engineering contract for maintainers, not public product copy.

## Core Content

### 1. Product promise and public language

ScriptaHub is a free library for readers, researchers, and creators who need more depth than short social posts or superficial articles provide. It supports niche knowledge, difficult ideas, research programmes, and speculative worlds through complete books and concise reading editions. Readers can propose, question, correct, and extend editions; useful accepted contributions may be credited.

Public copy explains what a visitor can accomplish, what action will occur, and what information is handled. It must not advertise incidental delivery architecture. Do not describe the site, forms, catalogue, or workflows to visitors as static, prebuilt, generated, backend-free, or temporary because of an implementation limitation. The implementation may evolve without changing the product promise.

### 2. Source of truth and generated output

Each book manifest under `docs/books/<normalised-English-title-words>/<bk-random-id>/manifest.json` is the source record. `docs/collection.json` and `docs/collection.js` are aggregate indexes rebuilt from manifests. `tools/build_books.mjs` owns route migration, manifest aggregation, edition links and history, book-page rendering, cover derivatives, discovery metadata, and catalogue validation. `tools/audit_internal_links.mjs` validates local links and anchors. These tools and their regression tests use native Node.js modules with four-space indentation. Only optional keyword extraction and local model inference use the Python worker in `tools/keywords/local_nlp.py`; cover conversion uses ImageMagick. See `dependencies.md` and `DS001-coding-style.md`. The browser account flow remains JavaScript.

Generated files are replaced from their sources. Do not patch generated book pages or aggregate catalogue files to make a durable change; change the generator or manifest and rebuild. A catalogue refresh may run periodically. That cadence is an operational detail and must not appear in visitor-facing copy.

### 3. Page topology

The site has these product surfaces:

- `docs/index.html`: the library entrance, introduction, keyword cloud, featured book, and dynamic keyword results.
- Localised `book.html` files: one book’s title, description, discovery cloud, reading actions, feedback action, edition history, and introduction.
- Canonical reader HTML: full and ten-minute reading modes, language selection, theme, text controls, and Read Aloud where supported.
- `docs/librarian/`: question-specific recommendations and a separate recommendation-feedback page.
- `docs/create/`, `docs/feedback/`, and `docs/editions/`: proposal, edition-feedback, and publication-history workflows.
- `docs/legal/`: terms, privacy, cookies and local storage, legal notice, and AI transparency.

The shared header keeps Create before any discovery action. The shared footer keeps the normal legal destinations visible. Selected interface language is carried by `?lang=` on navigation URLs.

### 4. Catalogue routes

Book routes contain one lower-case, punctuation-normalised folder per English title word, in title order, followed by a freshly random `bk-` identifier. Taxonomy, language, author, and arbitrary category folders never enter a book route.

Every book manifest has localised title, subtitle, short description, cover metadata, and exactly 100 distinct discovery keywords for each of `en`, `fr`, `de`, `es`, `pt`, `it`, `ro`, and `pl`. Every language has a `book.html` landing page. A complete reader may be unavailable only where no completed translation exists.

### 5. Keyword discovery

Keywords are catalogue data. They are specific fields, methods, problems, genres, and concepts that a reader could plausibly seek. A keyword has a stable language-independent identifier and a localised label. Slugs may remain in aggregate data for compatibility, but they do not define public routes.

There is no per-keyword HTML generation and no `docs/keywords/` directory. Creating one page for every translated term multiplies files without adding a distinct product surface and is forbidden.

The stable keyword URL contract is:

```text
index.html?lang=<supported-language>&keyword=<stable-keyword-id>
```

On the home page, choosing a cloud term updates browser history, resolves the keyword identifier in the selected language, filters `collection.books` by exact membership in `book.keywordIds`, and renders the matching book cards in the page. Changing language preserves the identifier and changes the localised label. Back and Forward restore the selected filter. A book-page cloud links to the same home-page URL contract. The fullscreen cloud preserves the selection callback of the cloud that opened it.

The non-visual cloud navigation contains the same destinations so keyboard and assistive-technology users receive real links. Missing or unknown keyword identifiers produce the ordinary unfiltered home page.

### 6. AI Librarian

The AI Librarian accepts a question in the visitor’s own words and returns at most ten catalogue recommendations. Ranking currently runs in the browser over localised titles, subtitles, descriptions, categories, and discovery keywords. Title and keyword signals carry more weight than general description text, and character-level matching tolerates modest spelling or word-form differences.

The result page opens directly with recommendations for the submitted question. It does not repeat the question form above the results. A restrained “Help improve these recommendations” action follows the list and opens the separate feedback page with the original question available as context.

Visitor-facing text describes personalised recommendations and how to ask a useful question. It does not expose ranking names, weights, indexes, or other implementation details. Legal and privacy text may describe the categories of information compared and whether a question leaves the device, without naming the ranking algorithm.

### 7. Cards and actions

Catalogue, keyword-filter, and Librarian result cards use the book thumbnail and one clear `View Book` action. `Read in 10 min` and `Read Online` appear only on the book page. Book pages keep `Suggest An Edit` as the visually primary editorial action and capitalise `Read Aloud` consistently.

On narrow screens, a result card begins with a two-cell action row: cover on the left and actions on the right; descriptive text follows below that row. Discovery keyword chips are hidden on mobile. In the featured book area, the description is line-clamped rather than allowed to push the actions outside the balanced cover-and-information layout.

Every labelled primary action uses the shared action font size, icon box, and icon-to-label gap. Icons reinforce action meaning but never replace an accessible label, except the Dictate control, whose visible icon has an accessible name and tooltip. Read-mode actions keep vertically centred labels.

### 8. Keyword cloud interaction

The embedded and fullscreen clouds share one component and one collision model. Keyword size combines catalogue popularity with projected 3D depth. Collision testing uses the rendered text bounds after scale, perspective, and rotation; a smaller rear term yields to a larger visible term, while ties are resolved deterministically enough to avoid flicker.

Dragging rotates the cloud. Ctrl-drag pans the camera. Wheel and pinch zoom toward the pointer or touch focus rather than toward a fixed centre. Embedded clouds accept these interactions where the background remains exposed. Fullscreen close restores the embedded cloud’s suspension, dimensions, and centred usable frame. Embedded mode does not display interaction instructions over the visual.

### 9. Visual system

The page reads as a compact tower of clear horizontal floors. Section boundaries come primarily from background and contrast changes, with restrained borders and small corner radii. Light and dark themes keep the same dimensions, hierarchy, spacing, and interactions; only their colour tokens change.

Light theme uses a calm neutral grey for the header, footer context, fields, and keyword-cloud floor, white for primary reading surfaces, and WhatsApp-inspired green for primary actions and selected states. Dark theme mirrors the hierarchy with true black primary surfaces, one calm dark grey for secondary floors and controls, muted cloud colours, and restrained green accents. Avoid adjacent near-identical greys that create visual noise.

Content uses one tower gutter on all floors. Desktop and mobile preserve a clear alignment line between headings, text, inputs, covers, and actions. The header remains compact on mobile: the wordmark has its own line and the controls form one line below it, with text labels removed from Create and Ask AI Librarian where space requires. The footer remains at the bottom of short pages without leaving a strip beneath it.

### 10. Home-page loading state

The home page hides the keyword cloud and featured book until catalogue-dependent content, cover imagery, fonts, and the initial layout are ready. The loader occupies the same calm grey discovery floor to prevent a flash of incomplete layout. Its animated book is prominent but finite, and the normal interface replaces it promptly; no artificial diagnostic delay is allowed.

### 11. Reader editions

Reader editions are canonical HTML. Repairs and translations use the chunk workflow in the `book-reader-translations` skill. PDFs remain English source editions and are not translated. The reader keeps language selection usable and uses the same single-state light/dark toggle as the main site. Compact mobile reader headers and footers must not overlap content or wrap into chaotic control rows.

Read Aloud reports useful ScriptaHub context when speech output cannot start, rather than exposing device capability diagnostics or redirecting the visitor into the text presentation.

### 12. Proposals, feedback, and editions

Create and feedback forms open a structured email addressed to `create@scriptahub.com`. Public copy states this direct outcome. Because an email link cannot attach selected local files, the interface must clearly tell visitors to attach those files in their email application. This functional disclosure remains until the transport changes; do not explain it as a missing backend.

The Create form groups name and reply email, promotional website and one proposed title, plus a compact attachment area as a third visual column where space permits. Attached filenames appear as bounded pills with a shortened stem and visible extension. Instructions for the book receive the main writing area. The contribution agreement must be accepted before submission.

Every book root owns `editions.json`. Existing records and downloads are preserved. Replacing a current PDF means archiving it under `edition-files/<edition-id>/<language>.pdf`, pointing the old record to the archive, and appending a new dated edition with a localised change log.

### 13. Privacy, legal, and AI communication

#### Reader account actions

Reading and direct PDF file URLs remain public. Clicking a site PDF download
(including historical editions and reader PDF links) or the book's edition-feedback
action requires a UserPersisto account. The popup opens registration first; enabled UserPersisto methods, including
optional Google, remain owned and configured by UserPersisto. Existing-account
sign-in remains available. Public signup
assigns `selfRegistered` under the configured registration policy and cannot
bootstrap an administrator. Existing `user` and `admin` accounts also qualify.

The shared browser client uses OpenID Connect Authorization Code with PKCE,
state, nonce, signature validation, and a same-origin callback. Each gated action
checks current UserInfo roles. Short-lived credentials remain in tab session
storage; passwords are entered only on UserPersisto. No refresh token is used.
Each retained action owns a five-minute attempt and one synchronous publication
grant. The original tab keeps Cancel available through authentication and any
delayed Continue. Candidate sessions remain private until publication. Cancellation,
expiry, provider failures and denied accounts leave the pending action unperformed
and preserve the feedback draft. Late results cannot publish or clear a newer
attempt. Only duplicate activation of the same retained action shares one popup;
a different action cannot consume that grant. Same-origin reader frames delegate
to a compatible parent with the exact action identity. The grant API advertises
numeric version `1`; callers must check it and pass their explicit owner and
expected version. Ownerless or incompatible calls fail before authentication,
without returning a grant or a bare account. Mixed browser caches receive
localized reload guidance; visitors must copy unsent text before reloading.
Incompatible iframe parents are not delegated to. The standalone reader blocks
incompatible loaded APIs rather than replaying through them or stacking listeners.
Ship matching versioned auth, callback, workflow and reader-loader asset references,
including generated book pages and current reader script queries; preserve all
other reader bytes, historical editions and PDFs.

The callback supports a same-origin state-keyed BroadcastChannel and strict
postMessage; the first validated delivery wins. A lost opener or apparently closed
popup does not terminate a working alternate transport. Loss of both transports
ends through original-tab Cancel/deadline with retry guidance. The callback
acknowledgment reports delivery only. Continue activation and PDF replay require
an active unused grant; detached/cancelled/expired controls cannot navigate.
Feedback rechecks its current connected form, draft and agreement before its
synchronous mail handoff. Cancel prevents local publication but cannot undo
already completed remote account/link/session changes. Tab-reload recovery is
outside this contract.
Site notices support all eight interface languages. See `docs/auth/README.md` for
the client configuration, callback and browser contracts.

This account check also runs on direct feedback-form submission. The existing
structured-email workflow and contribution agreement remain in force; accounts
do not introduce stored public reviews. Create proposals remain public. Future
stored-review writes require server-side authorization independently of this
browser interaction gate.

Legal pages remain easy to reach and distinguish confirmed behavior from placeholders that require operator or counsel input. Privacy copy states what hosting, local preferences, dictation providers, email providers, and reader analytics may process. AI transparency explains that books can be AI-assisted, that recommendations are relative catalogue matches, and that editorial responsibility and correction routes matter.

No public legal or product text should freeze the service into its current delivery method. Claims about data handling must remain precise even if the transport changes; update privacy and AI pages alongside any architecture change that changes those claims.

### 14. Validation and change control

After a catalogue, generator, route, or shared interaction change, run:

```text
npm run build
npm test
```

`npm test` includes the browser account tests, Node.js tool tests, catalogue
validation, and local-link audit. Also syntax-check changed modules and the optional Python worker when edited,
run `git diff --check`, and verify these invariants:

- `docs/keywords/` does not exist.
- No source or generated book page links to `/keywords/<language>/<slug>/`.
- Keyword URLs use a stable identifier and preserve `lang`.
- All eight supported languages resolve the same identifier to a localised label.
- Catalogue cards expose one `View Book` action; reading actions stay on book pages.
- The AI Librarian returns no more than ten results and feedback follows the result list.
- Public copy does not describe the site or workflows as static, prebuilt, generated, temporary because of architecture, or backend-free.

A deliberate change to one of these decisions updates this specification, its implementation, generator checks where practical, and any affected public privacy or legal statement in the same change.

### 15. Fork preview deployment

The `skutner/ScriptaHub` fork publishes `user-persisto-v2` at
`https://skutner.github.io/ScriptaHub/`. Its `scriptahub-preview` public client
uses a loopback UserPersisto issuer for testing on the Explorer host. This fork
has no production custom domain. Preview configuration and setup are recorded
in `PREVIEW.md`; account data stays in the selected local Explorer deployment.

## Conclusion

ScriptaHub preserves public reading and durable edition access while its account
gates resume one retained PDF or feedback action under current UserPersisto
membership. Catalogue, publishing and interaction changes must preserve the
contracts and run the validation defined here.
