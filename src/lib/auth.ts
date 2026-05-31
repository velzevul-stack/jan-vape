import { createHmac, timingSafeEqual, createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getRepo } from './db'

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000
const NONCE_CACHE = new Map<string, number>()
const NONCE_MAX_SIZE = 5000

function pruneNonces() {
  const cutoff = Date.now() - TIMESTAMP_WINDOW_MS
  for (const [key, ts] of NONCE_CACHE) {
    if (ts < cutoff) NONCE_CACHE.delete(key)
  }
}

function normalizeTimestampMs(raw: number): number {
  if (raw > 1e17) return Math.floor(raw / 1e6)
  if (raw > 1e14) return Math.floor(raw / 1e3)
  return raw
}

export function verifySyncAuth(req: NextRequest, rawBody: string): boolean {
  const apiKeyHash = process.env.SHOP_API_KEY_HASH
  const hmacSecret = process.env.HMAC_SECRET
  if (!apiKeyHash || !hmacSecret) return false

  const shopKey = req.headers.get('x-shop-key') ?? ''
  const signature = req.headers.get('x-signature') ?? ''
  const timestampStr = req.headers.get('x-timestamp') ?? ''

  const timestampRaw = parseInt(timestampStr, 10)
  if (isNaN(timestampRaw)) return false

  const now = Date.now()
  if (Math.abs(now - normalizeTimestampMs(timestampRaw)) > TIMESTAMP_WINDOW_MS) return false

  const keyHash = createHash('sha256').update(shopKey).digest('hex')
  const keyBuf = Buffer.from(keyHash, 'hex')
  const expectedBuf = Buffer.from(apiKeyHash, 'hex')
  if (keyBuf.length !== expectedBuf.length) return false
  if (!timingSafeEqual(keyBuf, expectedBuf)) return false

  const expected = createHmac('sha256', hmacSecret)
    .update(`${timestampStr}.${rawBody}`)
    .digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const sigBuffer = Buffer.from(signature, 'hex')
  if (sigBuffer.length !== expectedBuffer.length) return false
  if (!timingSafeEqual(expectedBuffer, sigBuffer)) return false

  const nonceKey = `${shopKey}:${signature}`
  if (NONCE_CACHE.has(nonceKey)) return false
  if (NONCE_CACHE.size > NONCE_MAX_SIZE) pruneNonces()
  NONCE_CACHE.set(nonceKey, now)

  return true
}

export function verifyBasicAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_BASIC_AUTH ?? ''
  if (!expected) return false
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Basic ')) return false
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8')
  const expectedBuf = Buffer.from(expected)
  const decodedBuf = Buffer.from(decoded)
  if (decodedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(expectedBuf, decodedBuf)
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export async function withIdempotency(
  key: string | null,
  handler: () => Promise<{ status: number; body: unknown }>,
): Promise<NextResponse> {
  if (!key) {
    const result = await handler()
    return NextResponse.json(result.body, { status: result.status })
  }

  const repo = await getRepo('IdempotencyKey')
  const existing = await repo.findOne({ where: { key } })
  if (existing) {
    return NextResponse.json(existing.responseBody, { status: existing.responseStatus })
  }

  const result = await handler()

  await repo.save(
    repo.create({ key, responseStatus: result.status, responseBody: result.body }),
  )

  return NextResponse.json(result.body, { status: result.status })
}

export function maskTelegram(value: string): string {
  if (value.length <= 3) return '***'
  return value.slice(0, 2) + '***'
}

export type SignedRequestHeaders = Record<string, string>

export function signRequest(
  body: string,
  shopKey: string,
  hmacSecret: string,
): SignedRequestHeaders {
  const timestamp = Date.now().toString()
  const signature = createHmac('sha256', hmacSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
  return {
    'X-Shop-Key': shopKey,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json',
  }
}
