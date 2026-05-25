import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'

const PatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  workDayStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workDayEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxBookingsPerSlot: z.number().int().min(1).optional(),
  slotStepMinutes: z.number().int().min(1).max(60).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const repo = await getRepo(PickupLocation)
  const loc = await repo.findOne({ where: { id: params.id } })
  if (!loc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }
  await repo.update(loc.id, parsed.data)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const repo = await getRepo(PickupLocation)
  await repo.update(params.id, { isActive: false })
  return NextResponse.json({ ok: true })
}
