# ShowTELA Deployment Flow (Canonical)

1. `git checkout work`
2. `git pull origin main`
3. Develop **only** on `work`
4. `npm run lint`
5. `npm run build`
6. `git push origin work`
7. Open PR: `work -> main`
8. Verify preview deployment
9. Merge PR
10. Verify production deployment SHA
11. Verify live runtime behavior at `/showtela`

## Non-negotiable
`npm run build` passing does **not** mean production updated.
