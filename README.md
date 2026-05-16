# TELAOne Alpha

TELAOne is a continuity-first operational cognition runtime designed to help humans create, remember, decide, and execute across persistent operational memory.

TELAOne is **not**:
- a generic chatbot
- a productivity dashboard
- a traditional RAG wrapper
- a note-taking app

TELAOne **is**:
- a continuity runtime
- an operational memory system
- an artifact-aware cognition layer
- a governed retrieval environment
- a restoration-first operational interface

## Core Philosophy

### Continuity First
TELA prioritizes restoration of operational state, unresolved threads, lineage, and context continuity over simple semantic recall. Continuity restoration and unresolved-state visibility are treated as runtime primitives, not optional features.

### Artifact Runtime
Generated outputs are treated as operational artifacts, not disposable chat text. Artifacts carry metadata, lineage context, and continuation hooks so they can be restored, inspected, downloaded, and used to resume work.

### Sovereign Architecture
Models are interchangeable. Memory, governance, continuity, retrieval, orchestration, and operational context are the actual product surface. The runtime is designed to preserve provider abstraction and reduce coupling between model choice and operational memory.

### Operational Calm
The interface is intentionally restrained:
- mobile-first
- tactile
- cinematic
- low-noise
- thumb-native
- continuity-aware

## Current Runtime Capabilities

### Continuity Runtime
- session restoration (`src/lib/runtime/sessionOpen.ts`, `src/lib/runtime/sessionRestoration.ts`)
- unresolved continuity persistence (`src/lib/runtime/unresolvedContinuity.ts`)
- snapshot hydration and persistence (`src/lib/runtime/continuitySnapshots.ts`, `src/lib/runtime/snapshotPersistence.ts`)
- continuity retrieval (`src/lib/runtime/continuityRetrieval.ts`)
- runtime restoration support paths (`src/lib/runtime/runtimeHydration.ts`, `src/lib/runtime/continuityPersistence.ts`)

### Artifact Pipeline
- artifact extraction and materialization (`src/lib/artifacts/runtime.ts`)
- artifact persistence and lookup (`src/lib/artifacts/artifactStore.ts`)
- artifact sanitization and payload boundary handling (`src/lib/artifacts/runtime.ts`)
- runtime artifact classification (`runtime_artifact` model in artifact runtime/store)
- continuation-aware artifact flows in UI (`src/components/ChatInterface.tsx`, `src/components/artifacts/*`)

### Retrieval Layer
- hybrid retrieval orchestration (`src/lib/retrieval/hybridRetrieval.ts`, `src/lib/runtime/retrievalOrchestrator.ts`)
- vector retrieval foundations (`src/lib/retrieval/vectorSearch.ts`, `src/lib/supabase/vectorQueries.ts`)
- continuity blending (`src/lib/retrieval/continuityBlender.ts`)
- canonical resolution (`src/lib/retrieval/canonicalResolver.ts`)
- retrieval traces (`src/lib/retrieval/retrievalTrace.ts`)

### Runtime Infrastructure
- operational state and digest layers (`src/lib/runtime/operationalState.ts`, `src/lib/runtime/operationalDigest.ts`)
- entity graph and reconciliation foundations (`src/lib/runtime/entityGraph.ts`, `src/lib/runtime/entityReconciliation.ts`)
- provenance ranking and lineage support (`src/lib/runtime/provenanceRanker.ts`, `src/lib/runtime/validationLogs.ts`)
- runtime hydration and persistence adapters (`src/lib/runtime/runtimeHydration.ts`, `src/lib/runtime/durableMemory.ts`)
- freshness lifecycle and maintenance (`src/lib/runtime/freshnessLifecycle.ts`, `src/lib/runtime/memoryMaintenance.ts`)
- orchestration layers (`src/lib/runtime/serverOrchestrator.ts`, `src/lib/runtime/contextAssembler.ts`)
- workspace isolation foundations (`src/lib/runtime/workspaceIsolation.ts`)

### Ingestion Systems
- chunking (`src/lib/ingestion/chunking.ts`)
- entity extraction (`src/lib/ingestion/entityExtraction.ts`)
- ingestion queue/scheduling foundations (`src/lib/runtime/ingestionQueue.ts`, `src/lib/runtime/ingestionScheduler.ts`)
- retry policies (`src/lib/ingestion/retryPolicy.ts`)
- provenance ingestion helpers (`src/lib/ingestion/provenance.ts`)
- Notion ingestion foundations (`src/lib/ingestion/notionIngest.ts`)

## Technology Stack

### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Framer Motion design direction (interaction model specified in design docs; runtime dependency not yet integrated)

### Runtime
- Supabase integration surface (`src/lib/supabase/*`)
- pgvector query foundations (`src/lib/supabase/vectorQueries.ts`)
- retrieval orchestration (`src/lib/runtime/retrievalOrchestrator.ts`)
- continuity persistence (`src/lib/runtime/continuityPersistence.ts`, `src/lib/runtime/snapshotPersistence.ts`)
- operational hydration (`src/lib/runtime/runtimeHydration.ts`)

### Deployment
- GitHub branch + PR workflow
- Vercel deployment target
- Codex-assisted development workflow

## Design Language

The TELA design system emphasizes:
- deep navy surfaces
- warm cream typography
- restrained gold accents
- editorial spacing
- glass layering
- cinematic restraint
- tactile interaction
- operational calm
- Rolodex-inspired cognition

The interface should feel like an operational instrument, not a SaaS dashboard.

## Development Workflow

Canonical flow:

Codex  
→ GitHub branch  
→ PR review  
→ Vercel deployment  
→ runtime validation

All changes must:
- pass `npm run lint`
- pass `npm run build`
- preserve continuity architecture
- avoid breaking artifact persistence
- avoid runtime-state corruption
- preserve mobile-first interaction behavior

## Runtime Governance

Do **not**:
- introduce generic AI-agent theater
- add dashboard clutter
- break continuity restoration
- replace artifact runtime model
- bypass provenance systems
- introduce noisy UX

Preserve:
- continuity-first cognition
- operational calm
- artifact lineage
- retrieval orchestration
- sovereign architecture direction
- mobile-first runtime behavior

## Current Status

TELAOne Alpha is currently in active runtime stabilization and continuity architecture development.

Current focus:
- continuity stabilization
- retrieval orchestration
- artifact-runtime refinement
- mobile interaction systems
- sovereign operational memory
- runtime persistence reliability

Not yet complete:
- production security hardening
- full AKB ingestion pipeline
- multi-tenant governance
- provider abstraction maturity
- offline/local runtime support

## Vision

TELAOne aims to become:
- a sovereign operational runtime
- a continuity-native cognition system
- an operational memory layer
- a governed restoration environment
- a human-first alternative to disposable AI chat sessions

The models are not the product.  
Continuity is the product.

## ShowTELA Live Notion Home Screen

The Home Screen now uses the Notion API as the live continuity source.

### Required environment variables

Copy `.env.example` to `.env.local` and fill all values:

- `NOTION_API_KEY`
- `NOTION_DB_OPERATIONAL_UPDATES`
- `NOTION_DB_WEEKLY_OPS`
- `NOTION_DB_TOURING_MEMORY`
- `NOTION_DB_DECISIONS`
- `NOTION_DB_STAFFING`
- `NOTION_DB_CONTACTS`
- `NOTION_DB_ALIGNMENT_DOCS`
- `NOTION_DB_VENUE_NOTES`
- `NOTION_DB_RISK_TRACKING`

`Operational Updates` powers the live continuity feed using this mapping:
- `Type` -> continuity object type
- `Department` -> Active Ops rail
- `Owner` -> card owner
- `Summary` -> operational body copy
- `Unresolved` -> gold operational state
- `Pinned` -> priority continuity object

### Vercel deployment

1. Add the same environment variables in Vercel Project Settings.
2. Deploy this branch (do not deploy `main` directly).
3. The API route `/api/showtela/feed` runs in Node runtime and is tuned in `vercel.json`.
4. Home Screen uses server-side fetch with revalidation for mobile-first performance and smooth scrolling.
