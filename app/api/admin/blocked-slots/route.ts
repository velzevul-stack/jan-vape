import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { BlockedSlot } from '@/src/entities/BlockedSlot'

const SlotSchema = z.object({
  locationId: z.string().uuid().optional(),
  customAddressId: z.string().uuid().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const repo = await getRepo(BlockedSlot)
  const slots = await repo.find({
    relations: { location: true, customAddress: true },
    order: { startsAt: 'ASC' },
  })
  return NextResponse.json({ slots })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const body = await req.json()
  const parsed = SlotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }
  const repo = await getRepo(BlockedSlot)
  const slot = repo.create({
    ...parsed.data,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    locationId: parsed.data.locationId ?? null,
    customAddressId: parsed.data.customAddressId ?? null,
    reason: parsed.data.reason ?? null,
  })
  await repo.save(slot)
  revalidatePath('/admin/blocked-slots')
  return NextResponse.json(slot, { status: 201 })
}
