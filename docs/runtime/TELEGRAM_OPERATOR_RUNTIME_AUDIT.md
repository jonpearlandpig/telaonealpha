# TELEGRAM OPERATOR RUNTIME AUDIT
**Date:** 2026-05-22  
**Branch:** main  
**Scope:** operator/ directory — full runtime audit before Codex routing addition

---

## Active Telegram Entrypoint

`operator/index.ts` — bootstraps env validation then calls:

```
startPolling(handleUpdate)   ← operator/telegram/bot.ts
```

`startPolling` runs an infinite loop. Each iteration calls `getUpdates(offset)` with a 30-second long-poll timeout, advances the offset, and dispatches each update to `handleUpdate` asynchronously.

---

## Command Parsing Model

`operator/telegram/handler.ts:parseCommand()` — regex-based, evaluated in order:

| Priority | Pattern | Provider | Notes |
|---|---|---|---|
| 1 | `/codex [build\|ui\|patch\|review\|deploy] …` | `codex` | Already implemented |
| 2 | `/(build\|ui\|patch\|review\|deploy\|status) …` | `claude-code` | Legacy explicit modes |
| 3 | bare text | `claude-code` | Default fallback |

`/claude` prefix does **not exist** prior to this audit. Adding it at priority 2.5 (between codex and legacy).

---

## Auth Strategy

`operator/safety/validator.ts:isAllowedSender()`

- Reads `TELEGRAM_ALLOWED_USER_ID` (comma-separated numeric IDs)
- Parsed once at module load
- All non-matching sender IDs are silently rejected (no reply sent)
- If env var is unset, all senders are rejected

---

## Polling / Webhook Model

**Long-polling.** No webhook configured.

- `getUpdates` uses Telegram's `timeout=30` parameter
- On network error: 5-second backoff then retry
- Update offset is advanced per-message to prevent redelivery

---

## Subprocess Execution Strategy (pre-change)

`operator/runtime/executor.ts:spawnProvider()`

- **Claude Code**: `spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], { stdio: ['ignore', 'pipe', 'pipe'] })`
- **Codex**: `spawn('codex', ['exec', '--cd', REPO_ROOT, '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '--color', 'never', '-'], { stdio: ['pipe', 'pipe', 'pipe'] })` — prompt written to stdin

Output collected via stdout/stderr event listeners. 5-minute `setTimeout` kills process on timeout.

---

## Current Claude Runtime Path (pre-change)

```
Telegram message
  → handleUpdate (handler.ts)
    → parseCommand → provider: 'claude-code'
      → executeInstruction (executor.ts)
        → buildPrompt
          → spawnProvider('claude-code', prompt)
            → spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'])
              ← stdout/stderr piped back
            ← ExecutionResult
          ← formatted message
        ← sendMessage to Telegram
```

---

## tmux Status (pre-change)

**Not used.** No tmux invocation exists anywhere in the operator directory. Processes are direct child processes of the operator Node.js process.

---

## Safety Filter State (pre-change)

**APPROVAL_REQUIRED** (soft block with message):
- `force.?push`, `git push.*--force`, `rm\s+-rf`, `drop\s+table`, `delete.*migration`, `middleware`, `auth.*change`, `production.*deploy`

**FORBIDDEN** (hard block, no execution):
- `process\.env`, `\.env`, `secret`, `credential`, `api_key`, `password`

**Missing** (added in this pass):
- `\brm\b` (any rm invocation, not just rm -rf)
- `\bsudo\b`
- `\breboot\b`
- `\bshutdown\b`
- `git\s+reset\s+.*--hard`

---

## Safest Insertion Points

### Routing (`/claude` prefix)
**File:** `operator/telegram/handler.ts`  
**Location:** `parseCommand()` — insert between codexMatch and commandMatch checks  
**Risk:** None — additive regex match, existing branches unchanged

### Provider Execution (tmux sessions)
**File:** `operator/runtime/executor.ts`  
**Location:** Replace `spawnProvider()` + inner Promise block in `executeInstruction()`  
**Strategy:** Write prompt to temp file → Node.js wrapper script → shell runner script → `tmux new-session -d -s {name}` → poll output file for sentinel → return collected output  
**Risk:** Low — same inputs/outputs, same timeout behavior; `onProgress` becomes no-op (not currently called by any handler)

### Safety expansion
**File:** `operator/safety/validator.ts`  
**Location:** `FORBIDDEN_PATTERNS` array — append new entries  
**Risk:** None — additive patterns, existing patterns unchanged

---

## Post-Change Runtime Path

```
Telegram message
  → handleUpdate
    → parseCommand
        /claude …  → provider: 'claude-code'  ← NEW
        /codex …   → provider: 'codex'
        /build …   → provider: 'claude-code'
    → runInTmux(provider, prompt)             ← NEW
        write prompt to /tmp/tela-prompt-{ts}
        write node wrapper to /tmp/tela-wrap-{ts}.cjs
        write shell runner to /tmp/tela-run-{ts}.sh
        tmux kill-session -t {claude|codex}
        tmux new-session -d -s {claude|codex} -- sh runner
        poll /tmp/tela-out-{ts} for sentinel every 500ms
        return output string
      ← ExecutionResult (same shape as before)
    ← sendMessage to Telegram
```

**Observable via:** `tmux attach -t claude` or `tmux attach -t codex`
