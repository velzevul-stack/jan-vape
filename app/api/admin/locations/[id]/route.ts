import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, verifySyncAuth, unauthorizedResponse } from '@/src/lib/auth'
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
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rawBody = await req.text()
  const isBasic = verifyBasicAuth(req)
  const isHmac = !isBasic && verifySyncAuth(req, rawBody)
  if (!isBasic && !isHmac) return unauthorizedResponse()
  const { id } = await params
  const repo = await getRepo('PickupLocation')
  const loc = await repo.findOne({ where: { id } })
  if (!loc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }
  await repo.update(loc.id, parsed.data)
  revalidatePath('/admin/locations')
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const isBasic = verifyBasicAuth(req)
  const isHmac = !isBasic && verifySyncAuth(req, '')
  if (!isBasic && !isHmac) return unauthorizedResponse()
  const { id } = await params
  const repo = await getRepo('PickupLocation')
  await repo.update(id, { isActive: false })
  revalidatePath('/admin/locations')
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
