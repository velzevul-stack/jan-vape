import { NextRequest, NextResponse } from 'next/server'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { CustomAddress } from '@/src/entities/CustomAddress'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const repo = await getRepo(CustomAddress)
  const addresses = await repo.find({ order: { salesCount: 'DESC' }, take: 100 })
  return NextResponse.json({ addresses })
}
