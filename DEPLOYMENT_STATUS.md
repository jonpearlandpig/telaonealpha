# ShowTELA Alpha Deployment Status

Audit date: 2026-06-01

## Executive Status

**Deployment state: YELLOW.**

The currently deployed production build is Ready on Vercel, but the current local checkout cannot build. That means production is ahead of local reliability in one sense and behind local branch changes in another: deployed production is usable enough to serve `/signin`, but the current repo state cannot safely be redeployed without first fixing the local build.

## Current Deployment URL

Production alias:

- `https://telaonealpha.vercel.app`

Production deployment URL:

- `https://telaonealpha-39dha2weh-jonathan-3979s-projects.vercel.app`

Production deployment id:

- `dpl_GPfTKxK3Wk4MjzB6hSH4R8urgBUd`

## Latest Successful Deployment

Latest visible successful deployment from `vercel ls telaonealpha --yes`:

- URL: `https://telaonealpha-57gs4u1yh-jonathan-3979s-projects.vercel.app`
- Environment: Preview
- Status: Ready
- Age at audit: 20h
- Duration: 37s

Latest successful production deployment:

- URL: `https://telaonealpha-39dha2weh-jonathan-3979s-projects.vercel.app`
- Environment: Production
- Status: Ready
- Created: Sun May 31 2026 12:43:51 CDT
- Duration: 42s

## Latest Failed Deployment

No failed deployment appeared in the visible Vercel deployment list pages checked during this audit.

Evidence checked:

- First Vercel deployment page: latest 20 deployments, all `Ready`.
- Second Vercel deployment page: next 20 deployments, all `Ready`.

Status: **not found in visible deployment history checked**, not proof that no failed deployment has ever existed.

## Production Build Status

Vercel production:

- Status: Ready
- Alias resolves to production deployment.
- Anonymous `/showtela?workspace=tela-showtela` redirects to `/signin`.
- `/signin` loads with Google sign-in UI.

Local current checkout:

- `npm run build` fails.
- The current branch is not production-buildable until the TypeScript error in `src/lib/showtela/lifecycleRegistry.ts` is fixed.

Production build assessment: **Ready on Vercel, not reproducible from current checkout.**

## Preview Build Status

Visible preview deployments:

- Latest preview `telaonealpha-57gs4u1yh...`: Ready.
- Prior preview `telaonealpha-2f7oidt1c...`: Ready.
- Release-candidate preview `telaonealpha-mkq4zhd82...`: Ready.

Preview assessment: **Ready in deployed history, but current checkout would fail a new preview build.**

## Deployment Tooling Note

The Vercel CLI is not installed globally, but `npx vercel` worked and reported Vercel CLI `54.6.1`.

