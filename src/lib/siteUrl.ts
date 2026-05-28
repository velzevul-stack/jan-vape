import type { NextRequest } from 'next/server'

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getPublicSiteUrl(): string {
  const fromEnv = process.env.SITE_PUBLIC_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return normalizeBaseUrl(fromEnv.trim())
}

export function resolvePublicSiteUrl(req: NextRequest): string {
  const fromEnv = getPublicSiteUrl()
  if (fromEnv) {
    return fromEnv
  }

  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || req.headers.get('host')?.trim()
  if (!host) {
    return normalizeBaseUrl(req.nextUrl.origin)
  }

  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol =
    forwardedProto ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')

  return normalizeBaseUrl(`${protocol}://${host}`)
}
