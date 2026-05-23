import { sendMessage, type Update } from './bot'
import { formatWorking, formatResult, formatStatus, formatError } from './formatter'
import { executeInstruction, cancelActiveExecution, type RuntimeProvider } from '../runtime/executor'
import { gatherContext } from '../runtime/contextGatherer'
import { isAllowedSender, requiresApproval, isForbidden } from '../safety/validator'
import { logExecution, makeEventId } from '../logs/executionLog'

type Mode = 'build' | 'ui' | 'patch' | 'review' | 'deploy' | 'status'

function parseCommand(text: string): { mode: Mode; instruction: string; provider: RuntimeProvider } {
  const trimmed = text.trim()
  const codexMatch = trimmed.match(/^\/codex(?:\s+(build|ui|patch|review|deploy))?\s*/i)
  if (codexMatch) {
    const mode = (codexMatch[1]?.toLowerCase() ?? 'build') as Mode
    const instruction = trimmed.slice(codexMatch[0].length).trim()
    return { mode, instruction, provider: 'codex' }
  }

  const claudeMatch = trimmed.match(/^\/claude(?:\s+(build|ui|patch|review|deploy))?\s*/i)
  if (claudeMatch) {
    const mode = (claudeMatch[1]?.toLowerCase() ?? 'build') as Mode
    const instruction = trimmed.slice(claudeMatch[0].length).trim()
    return { mode, instruction, provider: 'claude-code' }
  }

  const commandMatch = trimmed.match(/^\/(build|ui|patch|review|deploy|status)\s*/i)
  if (commandMatch) {
    const mode = commandMatch[1].toLowerCase() as Mode
    const instruction = trimmed.slice(commandMatch[0].length).trim()
    return { mode, instruction, provider: 'claude-code' }
  }
  return { mode: 'build', instruction: trimmed, provider: 'claude-code' }
}

export async function handleUpdate(update: Update): Promise<void> {
  const msg = update.message
  if (!msg?.text || !msg.from) return

  const chatId = msg.chat.id
  const userId = msg.from.id
  const text = msg.text.trim()

  if (!isAllowedSender(userId)) {
    console.warn('[handler] rejected sender:', userId)
    return
  }

  if (text === '/stop' || text.toUpperCase() === 'STOP') {
    cancelActiveExecution()
    await sendMessage(chatId, '[operator] Active execution cancelled.')
    return
  }

  const { mode, instruction, provider } = parseCommand(text)

  if (mode === 'status') {
    const ctx = gatherContext()
    await sendMessage(chatId, formatStatus(ctx))
    return
  }

  if (!instruction) {
    const usage = provider === 'codex'
      ? '/codex [build|ui|patch|review|deploy] <instructions>'
      : `/${mode} <instructions>`
    await sendMessage(chatId, formatError(`No instruction provided. Usage: ${usage}`))
    return
  }

  const forbidden = isForbidden(instruction)
  if (forbidden) {
    await sendMessage(chatId, formatError(forbidden))
    return
  }

  const approvalNeeded = requiresApproval(instruction)
  if (approvalNeeded) {
    await sendMessage(chatId, formatError(`${approvalNeeded}\n\nNot executing. Send /status to check repo state.`))
    return
  }

  await sendMessage(chatId, formatWorking(mode, provider))

  const context = gatherContext()
  const eventId = makeEventId()
  const start = Date.now()

  const result = await executeInstruction(instruction, context, mode, provider)

  logExecution({
    event_id: eventId,
    timestamp: new Date().toISOString(),
    instruction_type: mode,
    instruction_source: 'telegram',
    runtime_provider: provider,
    changed_files: result.changedFiles,
    commit_hash: result.commitHash,
    build_status: result.buildStatus,
    deploy_status: 'none',
    elapsed_ms: Date.now() - start,
    error: result.error,
    approval_blocks: result.approvalBlocks,
  })

  await sendMessage(chatId, formatResult(mode, result, provider))
}
