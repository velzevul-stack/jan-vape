import { randomInt } from 'crypto'

const SUFFIX_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ'
const SUFFIX_LENGTH = 5
const DEFAULT_ATTEMPTS = 6
const UNIQUE_VIOLATION_CODE = '23505'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function generatePublicBookingNumber(date: Date = new Date()): string {
  const datePart = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
  let suffix = ''
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)]
  }
  return `B-${datePart}-${suffix}`
}

export function isPublicNumberConflict(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const candidate = err as {
    code?: string
    constraint?: string
    detail?: string
    driverError?: { code?: string; constraint?: string; detail?: string }
  }
  const code = candidate.code ?? candidate.driverError?.code
  if (code !== UNIQUE_VIOLATION_CODE) return false
  const constraint = candidate.constraint ?? candidate.driverError?.constraint ?? ''
  const detail = candidate.detail ?? candidate.driverError?.detail ?? ''
  return /public_?number/i.test(`${constraint} ${detail}`)
}

export async function withPublicNumberRetry<T>(
  operation: (attempt: number) => Promise<T>,
  attempts: number = DEFAULT_ATTEMPTS,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation(attempt)
    } catch (err) {
      if (!isPublicNumberConflict(err)) throw err
      lastError = err
    }
  }
  throw lastError
}
