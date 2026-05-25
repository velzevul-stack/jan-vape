import { NextRequest, NextResponse } from 'next/server'
import { getRepo } from '@/src/lib/db'
import { CustomAddress } from '@/src/entities/CustomAddress'
import { normalizeAddress } from '@/src/lib/normalize'
import { ILike } from 'typeorm'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ suggestions: [] })

  const repo = await getRepo(CustomAddress)
  const normalized = normalizeAddress(q)

  const results = await repo.find({
    where: { normalizedKey: ILike(`%${normalized}%`) },
    order: { salesCount: 'DESC' },
    take: 20,
  })

  return NextResponse.json({
    suggestions: results.map((a) => ({
      id: a.id,
      label: a.label,
      salesCount: a.salesCount,
    })),
  })
}
