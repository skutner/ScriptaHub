# ScriptaHub reader accounts

Reading stays public. Site PDF and edition-feedback actions request a UserPersisto
account in a popup and resume after successful authentication. PDF file URLs stay
public, including context-menu downloads and direct links. Feedback still opens
the visitor's email application; this change does not store or publish reviews.

## Configure the account service

Set `issuer` in `config.json` to the deployed UserPersisto issuer, including its
complete path ending in `/service/oidc`. Leave `clientId` as `scriptahub-web`, or
change it to match the registered public client. An empty issuer deliberately
keeps gated actions unavailable while reading remains usable. No credentials or
client secret belong in this repository.

Register this client through UserPersisto's authenticated administrator client
management API:

```json
{
  "client_id": "scriptahub-web",
  "client_name": "ScriptaHub",
  "redirect_uris": ["https://scriptahub.com/auth/callback.html"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code"],
  "scope": "openid email roles"
}
```

Initialize the service owner using the existing UserPersisto setup flow before
enabling public registration. Enable password login and self-registration, with
`selfRegistered` as the registration role. The provider's `user-persisto-v2`
changes support `screen_hint=signup` and prevent the OIDC signup endpoint from
creating the initial administrator. Existing `user` and `admin` accounts also
qualify for the site's gated actions.

UserPersisto's issuer must be publicly reachable over HTTPS, and the Ploinky
public-protocol route must preserve OIDC discovery, JWKS, authorization, token,
and UserInfo responses. Cross-origin token and UserInfo requests use bearer
tokens with `credentials: omit`. UserPersisto allows the exact origins of the
client's registered callback URLs. Do not enable credentialed wildcard CORS.
The canonical production origin is `https://scriptahub.com`; a `www` hostname
or GitHub project preview needs its own exact registered callback URL. Local
development permits HTTP only on loopback addresses.

## Browser contract

`src/auth.js` exposes `window.ScriptaHubAuth.grantApiVersion = 1` and
`requireAccount(action, actionOwner, expectedVersion)`, resolving to an opaque one-shot grant or `null` when cancelled, unavailable or
another distinct action is pending. Callers check the exact numeric API version
before requesting authentication, then pass `1` and a non-null owner object,
function or symbol. Ownerless, unversioned and incompatible requests return
`null` before any account lookup, popup or grant; they never return a bare account.
Feedback and reader entry points show localized reload guidance when versions
mismatch. Copy unsent text before reloading; pending actions are not recovered.
Iframe delegation requires the same supported version and method. An incompatible
parent leaves the child with its own grant flow. A standalone reader with an
incompatible API blocks the action without stacking another bundle's listeners.
Pass the same retained owner object only
for duplicate activation of the same action, including same-origin parent-frame
delegation. The grant exposes `account`, synchronous `publish(effect)`, `cancel()`
and `onFinish(cleanup)`. A consumer must publish its exact captured action through
`publish`; it cannot await inside that effect. Publication consumes the grant
before the effect, so duplicate or reentrant publication throws. Links use
`data-auth-action="download"` or `data-auth-action="feedback"`. The shared reader
and standalone reader also gate local PDF anchors. Feedback submission rechecks
the account even when the visitor opens the feedback URL directly.

The popup uses Authorization Code with S256 PKCE, fresh state and nonce.
`openid-client` validates the authorization response and ID token, including its
signature. The callback has no analytics, removes the response query from its
history, and delivers the callback URL over a same-origin BroadcastChannel keyed by fresh
outer state alongside strict opener postMessage. The original tab validates exact
callback origin/path, bounded URL, a single matching state, payload type, and
postMessage source window. Only the first valid response is accepted. Channel
absence/construction failures retain postMessage; loss of both transports gives
retry guidance. The acknowledgment confirms delivery only. Apparent popup closure
is advisory because COOP can sever the opener. No persistent storage relays codes.

Only the short-lived access token, its expiry, issuer, client ID and subject are
kept in `sessionStorage` for that tab. Passwords stay on UserPersisto. No refresh
token is requested. Every gated action checks UserInfo for current membership;
stored role flags are never authorization evidence. Expired sessions restart the
popup flow. UserPersisto's existing session may avoid another password prompt.
An accessible original-tab status and Cancel control remain active through
configuration, discovery, current UserInfo, sign-in, code exchange, token
verification, new UserInfo, and delayed Continue. Each attempt has an immutable
generation, an AbortController and a five-minute monotonic deadline. Guards run
after asynchronous work and immediately before publication; aborting a transport
alone is insufficient. Verified candidate sessions stay private until an active,
unexpired grant synchronously commits the session and performs its one retained
action. Cancellation discards the candidate and preserves any unrelated valid
session. Late failures/cleanup cannot clear a newer attempt or its session.
Cancelling leaves the current page and feedback draft intact. Duplicate activation
of the same retained action shares its attempt; distinct actions cannot share a
grant, including actions from same-origin embedded readers.
New-tab requests retain their intent through a Continue link after authentication,
providing a fresh user gesture even after a long signup. Popup blockers receive an explicit Continue
button. Closing, cancelling or expiring a Continue control invalidates even a
retained detached DOM node. Feedback rechecks the connected form, latest draft,
validity and agreement immediately before its synchronous mail handoff. An
unavailable issuer or denied account leaves the action unperformed.

Original-tab Cancel governs only ScriptaHub session/action publication; a remote
Google authorization, UserPersisto account/link or server session may already
exist and cannot be rolled back by this control. Reload/closure of the original
tab loses the pending action; there is no reload recovery.

This is a voluntary site interaction gate. A future stored-review endpoint must
independently validate the access token, allowed client/resource, current account
status and role on its server. A browser check cannot enforce write access to an
API, and this release makes no such API available.

## Build and verify

The browser bundle is checked in so GitHub Pages can serve it directly. Use
Node.js 22.12 or newer for book generation, validation, and the browser bundle. Edit `src/`, then regenerate the bundles; do not edit
`docs/assets/auth*.js` by hand.

```sh
npm ci
npm run build
npm test
```

Pinned browser dependencies and their licences are included by the build. Book
page changes originate in `tools/build_books.mjs` and are emitted by
`node tools/build_books.mjs refresh` (also available as `npm run build:books`).
The generator, catalogue checker, link auditor, and their tests use native
Node.js modules. Optional keyword inference still uses a local Python worker;
see [dependencies.md](../../dependencies.md). The browser account flow remains JavaScript. Canonical reader HTML
and PDFs are preserved. The compatibility release updates only the shared
`standalone.js` version query in current canonical reader HTML. Reader content,
other attributes, historical readers and PDF bytes remain unchanged. Deploy the
generated auth/callback bundles, workflow, standalone loader and their versioned
HTML references together; compatibility checks still fail closed across mixed
browser caches.

Before publishing, test against the selected deployed issuer: anonymous reading,
signup to `selfRegistered`, existing-account sign-in, explicit consent, download
resumption, feedback-draft preservation, popup cancellation/blocking, expiry and
blocked accounts. Local browser tests cannot establish the deployed proxy's
headers, TLS configuration or registered-client state.

## Preview configuration and Google

The original Axiologic repository and the `skutner` fork are distinct release
sources. The current preview is `https://skutner.github.io/ScriptaHub/`, with
client `scriptahub-preview` and issuer
`http://127.0.0.1:8080/base-agent-additional-server/userPersistoAgent/7000/service/oidc`.
Its exact UserPersisto callback is
`https://skutner.github.io/ScriptaHub/auth/callback.html`. This loopback issuer is
reachable only from a browser on its serving computer. The checked-in default
has an empty issuer and client `scriptahub-web`; building does not configure the
preview. Preserve each environment's `auth/config.json` during an authorized
release. Do not substitute the fork's callback for the original site's callback.

Google is an optional upstream sign-in method owned by UserPersisto. ScriptaHub
still requests only UserPersisto tokens and does not receive Google secrets,
tokens or subjects. The Google Web application's exact callback belongs to
UserPersisto, not to ScriptaHub. Enable/configure Google through the selected
UserPersisto deployment's administrator/operator procedure; no Google SDK or
additional browser library is needed here. Real Google chooser/consent, exact
Google Cloud registration, public-host routing, Chrome Local Network Access
allow/deny behavior, Firefox and Safari acceptance require their selected
operator configuration, browsers and authorized test accounts. A controlled
provider does not establish those results.

## Controlled browser verification

The loopback-only fixture `tests/fixtures/serve-auth.mjs` opens two unused ports,
serves the generated production auth bundles and a controlled OIDC provider,
and prints its selected site/issuer URLs and owned process ID. It creates a
fresh RSA signing key in memory, validates PKCE, and has explicit held-response
and COOP controls. It neither reads nor configures a Ploinky workspace. The
fixture PDF destinations are HTML sentinels for exact navigation, not PDF
renderer or real Google acceptance.

Run `npm run build:auth`, then `node tests/fixtures/serve-auth.mjs` in one
terminal. In an isolated Playwright CLI browser session open the printed site
URL, then run:

```sh
playwright-cli -s=scriptahub-auth open '<printed site URL>' --headed
playwright-cli -s=scriptahub-auth run-code --filename tests/browser/auth-popup.mjs
playwright-cli -s=scriptahub-auth run-code --filename tests/browser/auth-cancellation.mjs
playwright-cli -s=scriptahub-auth close
```

The scripts return the browser version and passed case names. The second suite
installs a virtual browser clock for the five-minute deadline; close its browser
session after that suite. Stop only the fixture's owned process with Ctrl-C.
Playwright CLI is an optional verification tool described in `dependencies.md`.
No deployment, stored credentials, public config or public site is changed.
