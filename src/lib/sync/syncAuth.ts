import { NextRequest, NextResponse } from 'next/server'
import { verifySyncAuth } from '../auth'

export async function withSyncAuth(
  req: NextRequest,
  handler: (rawBody: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const rawBody = await req.text()
  if (!verifySyncAuth(req, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handler(rawBody)
}
