# Deployment and live verification

Status: deployed on Vercel for demonstration; some production workflows remain unverified.

- Client: <https://smarttrip-planner-ph.vercel.app/>
- API: <https://smarttrip-planner-ph-api.vercel.app/>
- API health check: <https://smarttrip-planner-ph-api.vercel.app/api/health>

The repository uses separate Vercel projects rooted at `client` and `server`. The API health endpoint previously returned `{"status":"ok","service":"smarttrip-api"}`. The user confirmed the deployed site loads and that trip creation and AI itinerary generation/regeneration work. A health response and those user-reported flows do not verify every database, authorization, or account workflow.

## Remaining checks before calling it production-ready

1. Review and rotate any real credentials previously exposed outside the hosting provider. Keep database and AI credentials server-side; never put them in Vite variables.
2. Confirm the API project has `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, and `CLIENT_URL` configured in the host. Add AI-provider variables only for features being verified. The API entry is `server/api/index.js`.
3. Confirm the client project has `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` set to the deployed API origin ending in `/api`. These values are embedded at build time, so rebuild after changing them.
4. Confirm the intended production database and review pending migrations before applying them. Run `npm run db:deploy` only after reviewing migrations and arranging a backup; do not run development migrations against production.
5. Verify Supabase site and redirect URLs for the deployed frontend, including `/login` and `/reset-password`, then check registration, email confirmation, sign-in, recovery and session behavior.
6. Through the deployed frontend, confirm trip creation/editing, adding and removing the last itinerary day, date consistency, activity editing and budget updates. The October 4 day-management change needs this targeted check.
7. With a second account, verify it cannot read or change the first account's trips. Check shared pages expose only intended public data and that revoked links stop working.
8. Verify analytics, exports/downloads, map tiles, external directions, and direct navigation to nested client routes. Confirm browser requests use the deployed API, not localhost.
9. Keep the public README and any required private workspace documentation aligned with completed checks; label all remaining checks as pending.

The HTTP regression tests use mocked auth/database services. They complement these deployment checks but do not certify production credentials, Supabase policies, live database behavior, or account isolation.
