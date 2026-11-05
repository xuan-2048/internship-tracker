# Email/password authentication rollout

The independent email/password implementation is deployed and connected to Supabase project `xtwhmtdrglxiyaxxnetj`. The user explicitly approved opening the Site entrypoint to ordinary visitors on November 5, 2026. The Site is now public at the platform layer; application data still requires a verified Supabase session. The earlier audience-change rejection was resolved by that explicit approval.

Configured and verified on November 5, 2026:

- Supabase project healthy; email provider and new-user signup enabled; email confirmation required.
- Minimum password length set to 12 characters.
- Site URL and both exact callback URLs saved in the provider.
- Sites runtime configuration set; no provider secret/admin key is used.
- Production login page returns 200; anonymous application access returns 401; a synthetic invalid login returns 401 with `invalid_credentials`.
- Deployment: `appgdep_6aecec7acb888191864a42f7c43737b0`; source: `6b42d7b7068ec3aac86111fee14de11bd0cfe5a6`.

Remaining: owner-performed real signup/email verification; custom SMTP for delivery to ordinary registrants. Default provider mail only delivers to project-team addresses.

## Implemented

- English/Chinese sign-in, registration, forgot-password, and new-password pages.
- Server-only Supabase SSR clients with HttpOnly cookies, secure production cookies, and session refresh middleware.
- Email confirmation and password recovery callbacks, supporting PKCE codes or token hashes.
- Provider-verified user identity on every protected API request; unconfirmed email addresses are rejected.
- D1 ownership keys use `supabase:<verified-user-id>`. The browser cannot choose record ownership.
- Generic sign-in and recovery responses, bounded form input, and same-origin checks for writes.
- A sign-out control and redirect to sign-in when a session expires.

## Required account connection

The provider was configured through its authenticated dashboard because the installed Supabase connector returned unknown-tool errors. Reuse the existing project; do not create another. Do not paste passwords or a Supabase service-role key into chat. This implementation only needs a project URL and its publishable key at runtime, not an admin key.

Configure these names through Sites runtime environment variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_COOKIE_SECURE=true
```

For local development only, `.dev.vars` can set `SUPABASE_COOKIE_SECURE=false`. Never use that value in production. `.env.example` contains placeholder values only.

## Supabase configuration

1. Enable email/password authentication and require email confirmation.
2. Set Site URL to `https://internship-tracker-xuan.cheerfuloriole4.chatgpt.site`.
3. Allow the exact confirmation URLs `/auth/confirm` and `/auth/confirm?next=/reset-password` for that origin. Use separate loopback redirects only for development.
4. Use PKCE confirmation redirects, or configure token-hash templates pointing to `/auth/confirm?token_hash={{ .TokenHash }}&type=email` and recovery templates pointing to `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
5. Configure a production SMTP sender and appropriate provider rate limits. The provider's default testing mail service is not a substitute for a sender available to ordinary registrants.
6. Verify real signup confirmation, sign-in, session refresh, password reset, and sign-out with an authorized test account.

The new minimum password length is 12 characters. Passwords are sent to Supabase Auth and are never stored in D1 or logged by this application.

## Site access transition

Keep the currently published Site owner-private until real Supabase configuration and testing are complete. The new authenticated version has been published. The user explicitly approved the public entrypoint and the change was applied. Unauthenticated smoke checks verified that `/login` and `/register` return 200 while `/api/applications` and `/api/auth/session` return 401. Application data must continue to require provider-verified identity regardless of the platform audience.

After publication, verify anonymous requests receive 401, two real test users cannot access each other's records, and the browser can register and log in without a ChatGPT account. Do not use an empty configuration, test server, development mock sign-in, or client-supplied user ID as an authentication fallback.

Existing ChatGPT-owned rows remain separate. Do not reassign them based only on an untrusted email claim; migrate only after explicit ownership verification and authorization. The personal SQLite database is not uploaded.

## Tests

```bash
node --test tests/auth-input.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

For integration tests only, run `node tests/mock-auth.mjs` on loopback port 54390, point an ignored `.dev.vars` file at it with a nonsecret placeholder key and insecure loopback cookies, start the dev preview on port 5173, then run `python3 tests/auth-flow.py`. Remove the temporary `.dev.vars` file afterward. The fixture is never imported by production code and no real account or email is created by these tests.

These tests validate local routing, cookies, session enforcement, response handling, and user isolation. They do not prove delivery of real verification/reset emails or the configuration of the production provider.

References: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [Supabase SSR cookies and session verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
