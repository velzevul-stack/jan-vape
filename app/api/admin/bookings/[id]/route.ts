import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import type { WebBookingStatus } from '@/src/entities/WebBooking'

const PatchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const { id } = await params
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const repo = await getRepo('WebBooking')
  const booking = await repo.findOne({ where: { id } })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await repo.update(booking.id, { status: parsed.data.status as WebBookingStatus })

  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  revalidatePath('/')

  return NextResponse.json({ ok: true, status: parsed.data.status })
}
