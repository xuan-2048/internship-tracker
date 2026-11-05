# Internship Tracker — Hosted Version

This directory contains the authenticated, D1-backed version of Internship Tracker.

**Deployment status:** independent email/password authentication is deployed and connected to Supabase. The Site still has its owner-private platform gate until the owner explicitly approves making the entrypoint public. Real mailbox verification and production SMTP remain to be completed. See [AUTH_SETUP.md](AUTH_SETUP.md).
The original Python/SQLite application remains available in the parent directory.

## Stack

- Vinext / React / TypeScript server routes on Cloudflare Workers.
- Cloudflare D1 with Drizzle schema migrations.
- Supabase email/password authentication and server-verified sessions.
- The same HTML/CSS/JavaScript interface, including English/Chinese selection and task due-date views.

Every application row has an `owner_id`. Reads, updates, and deletes are scoped to the authenticated user; request bodies cannot set ownership. The API returns 401 when identity is missing and 404 for another user's record. Write requests reject cross-origin browser requests.

## Local development

```bash
npm run install:ci
npm run db:generate
npm run build
```

Apply each pending SQL migration from `drizzle/` once to the local database, using the Sites starter's documented Wrangler D1 command. Then run `npm run dev -- --hostname 127.0.0.1`.

The email/password implementation does not trust the portable starter’s mock ChatGPT identity. Configure a local Supabase project or the documented integration-test fixture to test sessions. Local development data and production D1 data are separate.

## Publishing

`.openai/hosting.json` identifies the existing Site and its D1 binding. Reuse that identity for future versions; do not create another Site. Build and publish through the Sites skill. Never commit `.env` files, local database state, or source repository credentials.

The interface assets in `public/` mirror the parent `frontend/` directory; `cloud.js` changes the storage description for hosted use. Update both when changing the shared interface.
