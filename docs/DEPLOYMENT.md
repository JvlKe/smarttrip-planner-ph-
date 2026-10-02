# Deployment preparation

Status: prepared locally; no hosting project has been created or verified.

The repository already includes separate Vercel configuration for client and server. Use two projects from this repository, with root directories `client` and `server`. Review build output and runtime logs before calling either deployment ready.

1. Replace credentials previously shared in chat, then set server-only credentials through the host's environment settings. Never put database or AI credentials in Vite variables.
2. For the API, configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, and `CLIENT_URL` using the chosen production frontend origin. Add the AI provider variables only when that integration is ready to verify. The API entry is `server/api/index.js`.
3. For the client, configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` ending in `/api` on the deployed API domain. These values are embedded at build time, so rebuild after changing them.
4. Confirm the intended production database before applying migrations. Run `npm run db:deploy` only after reviewing pending migrations and arranging a backup. Do not run development migrations against production.
5. Configure Supabase's site URL and allowed redirect URLs for the chosen frontend, including `/login` and `/reset-password`.
6. Verify API `/api/health`, then registration, confirmation, login, recovery, trip CRUD, activity editing and budgets through the deployed frontend. A health response alone does not prove database connectivity.
7. Check that a second account cannot read or change the first account's trips. Check shared pages contain only intended public data and revoked links stop working.
8. Verify map tiles, external directions, downloads and direct navigation to nested client routes. Confirm browser requests use the deployed API rather than localhost.
9. Add the verified public site URL to the public README and private workspace `project/README.md` only after these checks pass.

The HTTP regression tests use substituted database/auth services. They complement these deployment checks; they do not certify production credentials, Supabase policies, or database behavior.
