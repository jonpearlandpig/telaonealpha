const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export type TelegramUser = { id: number; username?: string; first_name?: string }
export type TelegramMessage = {
  message_id: number
  from?: TelegramUser
  chat: { id: number }
  text?: string
  date: number
}
export type Update = { update_id: number; message?: TelegramMessage }

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const truncated = text.length > 4000 ? text.slice(-4000) + '\n…(truncated)' : text
  await fetch(`${BASE()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: truncated }),
  }).catch(err => console.error('[telegram] sendMessage failed:', err))
}

export async function getUpdates(offset: number): Promise<Update[]> {
  const res = await fetch(`${BASE()}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`)
  if (!res.ok) throw new Error(`getUpdates HTTP ${res.status}`)
  const data = await res.json() as { ok: boolean; result?: Update[] }
  return data.result ?? []
}

export async function startPolling(handler: (update: Update) => Promise<void>): Promise<never> {
  let offset = 0
  console.log('[telegram] long-polling started')
  while (true) {
    try {
      const updates = await getUpdates(offset)
      for (const update of updates) {
        offset = update.update_id + 1
        handler(update).catch(err => console.error('[telegram] handler error:', err))
      }
    } catch (err) {
      console.error('[telegram] polling error:', err)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}
