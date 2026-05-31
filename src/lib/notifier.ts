import { getDataSource, getRepo, entityTableNames } from './db'
import { signRequest } from './auth'

const MAX_ATTEMPTS = 5
const RETRY_BACKOFF_MS = [
  3 * 1000,
  15 * 1000,
  2 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
]
const DELIVER_BATCH_SIZE = 25
const REQUEST_TIMEOUT_MS = 8000

let deliveryInFlight = false

async function hasBookingOutboxNotification(
  bookingId: string,
  eventType: string,
): Promise<boolean> {
  const ds = await getDataSource()
  const rows: unknown[] = await ds.query(
    `SELECT 1
     FROM "${entityTableNames.NotificationOutbox}"
     WHERE payload->>'bookingId' = $1
       AND payload->>'type' = $2
       AND ("deliveredAt" IS NOT NULL OR attempts < $3)
     LIMIT 1`,
    [bookingId, eventType, MAX_ATTEMPTS],
  )
  return rows.length > 0
}

export async function enqueueBookingUserbotNotification(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!endpoint) return
  const bookingId = payload.bookingId
  const eventType = payload.type
  if (typeof bookingId === 'string' && bookingId && typeof eventType === 'string') {
    if (await hasBookingOutboxNotification(bookingId, eventType)) {
      console.info('[notifier] skip duplicate booking notification', { bookingId, eventType })
      return
    }
  }
  await enqueueNotification(endpoint, payload)
}

export async function enqueueNotification(
  endpoint: string,
  payload: unknown,
): Promise<void> {
  if (!endpoint) return
  const repo = await getRepo('NotificationOutbox')
  const entry = repo.create({
    endpoint,
    payload,
    attempts: 0,
    lastError: null,
    nextRetryAt: new Date(),
    deliveredAt: null,
  })
  await repo.save(entry)

  void deliverPending().catch((err) => {
    console.error('[notifier] background deliverPending failed', err)
  })
}

export async function deliverPending(): Promise<{ delivered: number; failed: number }> {
  if (deliveryInFlight) return { delivered: 0, failed: 0 }
  deliveryInFlight = true
  try {
    return await runDeliveryBatch()
  } finally {
    deliveryInFlight = false
  }
}

async function runDeliveryBatch(): Promise<{ delivered: number; failed: number }> {
  const ds = await getDataSource()
  const shopKey = process.env.NOTIFY_WEBHOOK_SHOP_KEY ?? ''
  const hmacSecret = process.env.NOTIFY_WEBHOOK_HMAC_SECRET ?? ''
  if (!shopKey || !hmacSecret) {
    console.warn('[notifier] missing NOTIFY_WEBHOOK_SHOP_KEY / NOTIFY_WEBHOOK_HMAC_SECRET, skipping delivery')
    return { delivered: 0, failed: 0 }
  }

  let delivered = 0
  let failed = 0

  await ds.transaction(async (txn) => {
    const rows: Array<{
      id: string
      endpoint: string
      payload: unknown
      attempts: number
    }> = await txn.query(
      `SELECT "id", "endpoint", "payload", "attempts"
       FROM "${entityTableNames.NotificationOutbox}"
       WHERE "deliveredAt" IS NULL
         AND "nextRetryAt" <= now()
         AND "attempts" < $1
       ORDER BY "nextRetryAt" ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [MAX_ATTEMPTS, DELIVER_BATCH_SIZE],
    )

    for (const row of rows) {
      const body = JSON.stringify(row.payload)
      const result = await sendWithTimeout(row.endpoint, body, shopKey, hmacSecret)
      if (result.ok) {
        await txn.query(
          `UPDATE "${entityTableNames.NotificationOutbox}"
           SET "deliveredAt" = now(), "attempts" = "attempts" + 1, "lastError" = NULL
           WHERE "id" = $1`,
          [row.id],
        )
        delivered++
      } else {
        failed++
        const nextAttempts = row.attempts + 1
        if (nextAttempts >= MAX_ATTEMPTS) {
          await txn.query(
            `UPDATE "${entityTableNames.NotificationOutbox}"
             SET "attempts" = $1, "lastError" = $2
             WHERE "id" = $3`,
            [nextAttempts, truncateError(result.error), row.id],
          )
          console.error('[notifier] dropping notification after max attempts', {
            id: row.id,
            endpoint: row.endpoint,
            lastError: result.error,
          })
        } else {
          const backoff = RETRY_BACKOFF_MS[Math.min(row.attempts, RETRY_BACKOFF_MS.length - 1)]
          await txn.query(
            `UPDATE "${entityTableNames.NotificationOutbox}"
             SET "attempts" = $1,
                 "lastError" = $2,
                 "nextRetryAt" = now() + ($3 || ' milliseconds')::interval
             WHERE "id" = $4`,
            [nextAttempts, truncateError(result.error), String(backoff), row.id],
          )
        }
      }
    }
  })

  return { delivered, failed }
}

async function sendWithTimeout(
  endpoint: string,
  body: string,
  shopKey: string,
  hmacSecret: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const headers = signRequest(body, shopKey, hmacSecret)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

function truncateError(s: string): string {
  return s.length > 500 ? s.slice(0, 500) : s
}
