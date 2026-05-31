import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRepo } from '@/src/lib/db'
import { resolveDeliveryZone } from '@/src/lib/deliveryZoneResolve'

const BodySchema = z.object({
  text: z.string().min(2).max(500),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const repo = await getRepo('DeliveryZone')
  const zones = await repo.find({
    where: { isActive: true },
    order: { sortOrder: 'ASC', name: 'ASC' },
  })

  const result = resolveDeliveryZone(parsed.data.text, zones.map((zone) => ({
    id: zone.id,
    code: zone.code,
    name: zone.name,
    aliases: zone.aliases ?? [],
    roundTripMinutes: zone.roundTripMinutes,
    deliveryFee: Number(zone.deliveryFee),
  })))

  if (!result) {
    return NextResponse.json({ error: 'Empty address' }, { status: 422 })
  }

  return NextResponse.json(result)
}
