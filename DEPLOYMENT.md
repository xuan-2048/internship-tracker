# Deployment status

Published on November 5, 2026 through Sites as an owner-private application.

- URL: https://internship-tracker-xuan.cheerfuloriole4.chatgpt.site
- Site ID: `appgprj_6aecdf3893ec81919b3f01e615f95273`
- Source commit for the first publication: `6aa762a0814e28c9cdd911b88293ba539e42c60d`
- Deployment ID: `appgdep_6aece02c43548191b4a58ef7f53dc6ca`
- Hosted source: `hosted/`; binding: `DB` (Cloudflare D1).

The successful deployment result and owner-only access policy were verified with the Sites tools. Local hosted-preview checks covered persisted CRUD, task completion, English/Chinese switching, anonymous API rejection, and cross-user read/update/delete isolation.

The in-app browser reached the production sign-in gate, but its account-selection step returned an OpenAI authentication-page content-type error. An authenticated production CRUD session has not yet been verified. Use a normal browser and the owner's ChatGPT account to sign in; if the same error persists, investigate the platform login flow rather than weakening the Site's access policy.

Local personal data was not uploaded. The local Python application, hosted development database, and production D1 database are separate. Source visibility on GitHub does not grant access to the private Site. Keep source credentials, local data, `.wrangler/`, and environment files out of Git.

For subsequent updates, reuse the Site ID in `hosted/.openai/hosting.json` and follow the Sites skill. Append schema migrations instead of rewriting applied SQL. Verify the current audience before choosing the private publication tool.

## Independent email/password update

A second version was deployed on November 5, 2026 with Supabase project `xtwhmtdrglxiyaxxnetj`. The production build and four auth-input tests passed, and production smoke checks confirmed a 200 login page, 401 anonymous data access, and 401 invalid credentials. No real signup/password was created by the assistant.

Deployment ID: `appgdep_6aecec7acb888191864a42f7c43737b0`; source commit: `6b42d7b7068ec3aac86111fee14de11bd0cfe5a6`; runtime environment revision: 1.

The Site remains owner-private because automatic review rejected opening the Site to all visitors without explicit approval for that audience change. Do not work around that rejection. Obtain the user's approval before changing the platform entrypoint. The D1 APIs must continue to require provider-verified account identity after any audience change.

The default Supabase sender only delivers to project-team addresses. A production sender is still needed for arbitrary registrant addresses; do not disable email confirmation to evade this limitation.
