# Preview with local Explorer accounts

The public preview is <https://skutner.github.io/ScriptaHub/>. GitHub Pages
publishes `/docs` from `user-persisto-v2` in `skutner/ScriptaHub`. The upstream
`Axiologic/ScriptaHub` Pages source and `scriptahub.com` domain are independent.
This fork omits `docs/CNAME` so it uses its own GitHub Pages address.

## Test on the Explorer host

Keep the local Explorer deployment running at <http://127.0.0.1:8080> and open
the preview in a browser on that same computer. Allow local network access for
`https://skutner.github.io` if the browser asks. No HTTPS tunnel or public router
port is required for this setup.

Read a book without signing in. Select **Suggest An Edit** or **Download PDF**
to open UserPersisto registration. Enter a test email and password and approve
the account-access consent. The original action resumes after the callback.
Registration creates an account with the `selfRegistered` role in the local
Explorer deployment. An Explorer administrator can inspect it in
**Settings → Administration → Users**. Feedback submission opens an email
composer; it does not publish or store a review. Direct PDF URLs remain public.

## Account configuration

The published `docs/auth/config.json` uses this issuer:

```text
http://127.0.0.1:8080/base-agent-additional-server/userPersistoAgent/7000/service/oidc
```

Register the following public client with that local UserPersisto deployment:

```json
{
    "client_id": "scriptahub-preview",
    "client_name": "ScriptaHub preview",
    "redirect_uris": ["https://skutner.github.io/ScriptaHub/auth/callback.html"],
    "token_endpoint_auth_method": "none",
    "grant_types": ["authorization_code"],
    "scope": "openid email roles"
}
```

Password login and self-registration must be enabled, with `selfRegistered` as
the registration role. The exact registered callback also permits the preview
origin for browser token and UserInfo requests. No client secret is used.

On another computer, `127.0.0.1` refers to that computer, so this preview cannot
reach the original Explorer host. Reading remains available, but account actions
require a compatible local deployment there. A shared preview for other testers
would need a reachable HTTPS issuer and updated client registration.

## Update the preview

Merge the upstream `user-persisto-v2` changes into this fork's branch, preserving
the preview account configuration and the absence of `docs/CNAME`. Run the build
and tests described in README.md, then push to the fork's `user-persisto-v2`
branch. GitHub Pages publishes the updated preview. Do not copy the preview
issuer or client ID into production configuration.
