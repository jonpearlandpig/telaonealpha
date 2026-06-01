# ShowTELA Alpha Next 10

Audit date: 2026-06-01

Ranked by highest impact and lowest effort. No new architecture. No new features beyond making existing intended paths real.

1. Fix the production build error in `src/lib/showtela/lifecycleRegistry.ts`.
2. Commit or intentionally discard the current local-only audit/lifecycle/venue/readiness work so release state is knowable.
3. Re-run `npm run build`, `npm test`, and `npm run lint` from a clean working tree and record the result.
4. Resolve the React hydration mismatch in the ShowTELA home runtime.
5. Verify Google OAuth end-to-end on production with Juan's intended account.
6. Run a safe upload proof in an isolated ShowTELA/workspace, not the live proof workspace.
7. Re-test the known Calendar upload failure from `RELEASE_CANDIDATE_REPORT.md`.
8. Confirm whether invite/share are required for June 1; if yes, mark launch blocked because no implemented flow exists.
9. Verify return-later behavior using an authenticated browser session: upload/create continuity, close browser, reopen production, confirm changed state remains.
10. Pull the Vercel deployment list/logs into the release report and name the exact production deployment that passed the final proof.

