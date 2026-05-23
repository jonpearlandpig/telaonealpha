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

const STALE_AGE_S = 60

let pollingActive = false
let stopRequested = false

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const truncated = text.length > 4000 ? text.slice(-4000) + '\n…(truncated)' : text
  await fetch(`${BASE()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: truncated }),
  }).catch(err => console.error('[telegram] sendMessage failed:', err))
}

export async function getUpdates(offset: number, timeout = 30): Promise<Update[]> {
  const res = await fetch(`${BASE()}/getUpdates?offset=${offset}&timeout=${timeout}&allowed_updates=["message"]`)
  if (!res.ok) throw new Error(`getUpdates HTTP ${res.status}`)
  const data = await res.json() as { ok: boolean; result?: Update[] }
  return data.result ?? []
}

export function stopPolling(): void {
  stopRequested = true
}

export async function startPolling(handler: (update: Update) => Promise<void>): Promise<void> {
  if (pollingActive) {
    console.warn('[telegram] startPolling called twice — ignoring duplicate')
    return
  }
  pollingActive = true
  stopRequested = false

  // Drain stale backlog without long-polling so replay doesn't execute on boot.
  let offset = 0
  try {
    const stale = await getUpdates(0, 0)
    if (stale.length > 0) {
      offset = stale[stale.length - 1].update_id + 1
      console.log(`[telegram] drained ${stale.length} stale updates, offset → ${offset}`)
    }
  } catch (err) {
    console.warn('[telegram] stale drain failed:', err)
  }

  const seenIds = new Set<number>()
  console.log('[telegram] long-polling started')

  while (!stopRequested) {
    try {
      const updates = await getUpdates(offset)
      for (const update of updates) {
        offset = update.update_id + 1

        if (seenIds.has(update.update_id)) {
          console.warn('[telegram] duplicate update_id skipped:', update.update_id)
          continue
        }
        seenIds.add(update.update_id)
        // Bound the seen-set to prevent unbounded growth.
        if (seenIds.size > 500) {
          const oldest = [...seenIds].slice(0, 250)
          oldest.forEach(id => seenIds.delete(id))
        }

        if (update.message?.date) {
          const ageS = Math.floor(Date.now() / 1000) - update.message.date
          if (ageS > STALE_AGE_S) {
            console.warn(`[telegram] skipped stale update ${update.update_id} (${ageS}s old)`)
            continue
          }
        }

        // Sequential: await each handler so executions never run concurrently.
        await handler(update).catch(err => console.error('[telegram] handler error:', err))
      }
    } catch (err) {
      console.error('[telegram] polling error:', err)
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  pollingActive = false
  console.log('[telegram] polling stopped')
}
