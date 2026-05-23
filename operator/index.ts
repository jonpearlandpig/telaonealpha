import { startPolling, stopPolling } from './telegram/bot'
import { handleUpdate } from './telegram/handler'

function shutdown(signal: string): void {
  console.log(`[operator] ${signal} received — shutting down`)
  stopPolling()
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

async function bootstrap() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[operator] TELEGRAM_BOT_TOKEN is not set. Exiting.')
    process.exit(1)
  }

  if (!process.env.TELEGRAM_ALLOWED_USER_ID) {
    console.error('[operator] TELEGRAM_ALLOWED_USER_ID is not set. Exiting.')
    process.exit(1)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  TELA Operator Runtime v0.1')
  console.log('  Telegram → Claude Code / Codex relay')
  console.log('  Status: ACTIVE')
  console.log(`  PID: ${process.pid}`)
  console.log(`  Polling mode: long-poll (timeout=30s, sequential)`)
  console.log(`  Bot instances: 1`)
  console.log(`  Allowed sender IDs: ${process.env.TELEGRAM_ALLOWED_USER_ID}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await startPolling(handleUpdate)
}

bootstrap().catch(console.error)
