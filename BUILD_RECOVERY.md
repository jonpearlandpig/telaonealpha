# Build Recovery

Recovery date: 2026-06-01

## Summary

Build recovery succeeded.

The only code change made for build recovery was a TypeScript type-narrowing fix in:

`src/lib/showtela/lifecycleRegistry.ts`

## Fix Applied

Changed the registry map callback from inferred object typing to an explicit union return:

```ts
.map((row): ActiveShowTela | null => {
```

This makes the later filter predicate valid:

```ts
.filter((row): row is ActiveShowTela => Boolean(row))
```

## Verification

Command:

```bash
npm run build
```

Result:

```text
✓ Compiled successfully
✓ Generating static pages (20/20)
Build completed successfully
```

## Remaining Build Warnings

Next.js still warns that it inferred the workspace root as `/Users/jonhartman` because multiple lockfiles exist:

- `/Users/jonhartman/package-lock.json`
- `/Users/jonhartman/TELA/runtime/telaonealpha/package-lock.json`

This warning does not block the build.

Node also emits:

```text
[DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized...
```

This warning does not block the build.

## Current Build Status

**BUILD SUCCESS**

