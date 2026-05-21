import { sendMessage, type Update } from './bot'
import { formatWorking, formatResult, formatStatus, formatError } from './formatter'
import { executeInstruction } from '../runtime/executor'
import { gatherContext } from '../runtime/contextGatherer'
import { isAllowedSender, requiresApproval, isForbidden } from '../safety/validator'
import { logExecution, makeEventId } from '../logs/executionLog'

type Mode = 'build' | 'ui' | 'patch' | 'review' | 'deploy' | 'status'

function parseCommand(text: string): { mode: Mode; instruction: string } {
  const trimmed = text.trim()
  const commandMatch = trimmed.match(/^\/(build|ui|patch|review|deploy|status)\s*/i)
  if (commandMatch) {
    const mode = commandMatch[1].toLowerCase() as Mode
    const instruction = trimmed.slice(commandMatch[0].length).trim()
    return { mode, instruction }
  }
  return { mode: 'build', instruction: trimmed }
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

  const { mode, instruction } = parseCommand(text)

  if (mode === 'status') {
    const ctx = gatherContext()
    await sendMessage(chatId, formatStatus(ctx))
    return
  }

  if (!instruction) {
    await sendMessage(chatId, formatError(`No instruction provided. Usage: /${mode} <instructions>`))
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

  await sendMessage(chatId, formatWorking(mode))

  const context = gatherContext()
  const eventId = makeEventId()
  const start = Date.now()

  const result = await executeInstruction(instruction, context, mode)

  logExecution({
    event_id: eventId,
    timestamp: new Date().toISOString(),
    instruction_type: mode,
    instruction_source: 'telegram',
    runtime_provider: 'claude-code',
    changed_files: result.changedFiles,
    commit_hash: result.commitHash,
    build_status: result.buildStatus,
    deploy_status: 'none',
    elapsed_ms: Date.now() - start,
    error: result.error,
    approval_blocks: result.approvalBlocks,
  })

  await sendMessage(chatId, formatResult(mode, result))
}
