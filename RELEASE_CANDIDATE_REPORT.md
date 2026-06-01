# Release Candidate Report

Date: 2026-05-31

## Release Identity

- Commit hash: `e6adece3ac8f1b2f6a223d76aa69f00194092521`
- Commit message: `fix: stabilize june 1 proof release candidate`
- Tag: `showtela-june1-rc1`
- Remote release branch: `origin/showtela-june1-rc1`
- Note: `origin/work` advanced to `d1cd561e75a795014ea06d4257266a2c9d319035` during release preservation, so the exact candidate was preserved on the dedicated release branch and tag rather than rewriting shared branch history.

## Deployment

- Production alias: `https://telaonealpha.vercel.app`
- Exact deployment URL: `https://telaonealpha-39dha2weh-jonathan-3979s-projects.vercel.app`
- Vercel deployment id: `dpl_GPfTKxK3Wk4MjzB6hSH4R8urgBUd`
- Preview deployment URL: `https://telaonealpha-mkq4zhd82-jonathan-3979s-projects.vercel.app`

## Proof Workspace

- Workspace id: `tela-showtela`
- Proof workspace URL: `https://telaonealpha.vercel.app/showtela?workspace=tela-showtela`

## Verification Summary

- Login:
  Verified that production redirects anonymous users to `/signin`.
  Verified authenticated app access by setting a valid `showtela_session` cookie in the verification browser.
- Workspace open:
  Verified. Production `/showtela?workspace=tela-showtela` opened with HTTP 200.
- Anchor upload:
  Verified through deployed UI. The ingest form closed successfully and feed count increased from `82` to `83`.
- Calendar upload:
  Not verified. The deployed UI entered a loading/cancel state and did not recover during observation.
- Rider upload:
  Not verified because the Calendar upload blocked continued founder-path verification.
- Automatic hydration:
  Partially verified. Anchor upload auto-hydrated without refresh. Calendar upload did not complete, so full founder-path hydration is not proven.
- No 500 errors:
  No HTTP 500 responses were observed in browser verification.
  Vercel runtime logs did show error-level entries during `GET /api/showtela-data` and `POST /api/runtime/continuity/ingest`, despite HTTP 200 responses.

## Counts

- Runbook target counts:
  `18 people / 18 operations / 32 calendar / 52 feed`
- Deployed workspace counts before verification uploads:
  `45 people / 31 operations / 32 calendar / 82 feed / 0 unresolved`
- Deployed workspace counts after Anchor upload:
  `45 people / 31 operations / 32 calendar / 83 feed / 0 unresolved`
- Deployed workspace counts after Calendar upload attempt:
  `45 people / 31 operations / 32 calendar / 83 feed / 0 unresolved`

## Known Limitations

- The proof workspace is not clean. It is already heavily hydrated before the founder starts, which conflicts with the runbook expectation that the page should begin mostly empty and build up as files are added.
- The runbook target counts do not match deployed reality. The workspace already exceeds the documented people, operations, and feed counts before new uploads.
- The Calendar upload founder path did not complete in production during verification. The UI remained in a loading/cancel state and the live counts did not change.
- Rider upload could not be completed because the Calendar path blocked the remaining proof sequence.
- Production runtime logs contain error-level entries during hydration and ingest even when the HTTP status remains 200.
- Preview verification is additionally unsuitable for founder use because the preview deployment is protected by Vercel Authentication.

## GO / NO GO

`NO GO`

Reason:
The acceptance condition was not met. A non-technical founder cannot be considered able to execute the June 1 proof workflow without engineering assistance because the proof workspace is not in the documented clean baseline state, the Calendar upload did not complete in production, and the Rider step could not be validated after that block.
