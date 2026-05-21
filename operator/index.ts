import { startPolling } from './telegram/bot'
import { handleUpdate } from './telegram/handler'

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
console.log('  Telegram → Claude Code relay')
console.log('  Status: ACTIVE')
console.log(`  Allowed sender IDs: ${process.env.TELEGRAM_ALLOWED_USER_ID}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await startPolling(handleUpdate)
