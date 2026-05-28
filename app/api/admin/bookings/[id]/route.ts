import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, verifySyncAuth, unauthorizedResponse } from '@/src/lib/auth'
import { cancelWebBooking } from '@/src/lib/cancelWebBooking'
import { markCustomerTrusted } from '@/src/lib/customerStats'
import { getRepo } from '@/src/lib/db'
import type { WebBookingStatus } from '@/src/entities/WebBooking'

const PatchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
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

  const repo = await getRepo('WebBooking')
  const booking = await repo.findOne({ where: { id } })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newStatus = parsed.data.status as WebBookingStatus

  if (newStatus === 'cancelled' && booking.status !== 'cancelled') {
    await cancelWebBooking(booking, null, { cancelledBy: 'admin' })
  } else if (newStatus !== booking.status) {
    await repo.update(booking.id, { status: newStatus })
    if (newStatus === 'completed') {
      try {
        await markCustomerTrusted(booking.customerTelegram)
      } catch (err) {
        console.error('[admin/bookings PATCH] markCustomerTrusted failed', err)
      }
    }
    revalidatePath('/admin')
    revalidatePath('/admin/bookings')
    revalidatePath('/')
  }

  return NextResponse.json({ ok: true, status: newStatus })
}
