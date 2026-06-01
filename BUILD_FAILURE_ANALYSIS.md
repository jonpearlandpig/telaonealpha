# Build Failure Analysis

Audit date: 2026-06-01

## File

`src/lib/showtela/lifecycleRegistry.ts`

## Exact Build Failure

`npm run build` fails during TypeScript validation:

```text
./src/lib/showtela/lifecycleRegistry.ts:86:27
Type error: A type predicate's type must be assignable to its parameter's type.
Type 'ActiveShowTela' is not assignable to type '{ showTelaId: string; showTelaName: string; workspaceId: string; createdAt: string; lastActivityAt: string; archivedAt: string | undefined; status: "active" | "archived"; }'.
Property 'archivedAt' is optional in type 'ActiveShowTela' but required...
```

The failing line is the null filter:

```ts
.filter((row): row is ActiveShowTela => Boolean(row))
```

## Root Cause

The `.map()` callback returns either `null` or an object literal. Because the object literal always included `archivedAt`, TypeScript inferred the mapped object shape as having a required `archivedAt: string | undefined` property.

`ActiveShowTela` defines `archivedAt` as optional:

```ts
archivedAt?: string
```

That made the filter type predicate invalid: TypeScript requires the predicate target type to be assignable to the inferred parameter type, and `ActiveShowTela` with optional `archivedAt` is not assignable to an inferred object type where `archivedAt` is required.

## Required Fix

Make the map return type explicit:

```ts
.map((row): ActiveShowTela | null => {
```

Then return the same object shape without relying on `satisfies` to drive inference.

This is a build-only typing fix. It does not change registry behavior, archived ShowTELA detection, sorting, or runtime data.

