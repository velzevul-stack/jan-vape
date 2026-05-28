import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { rescheduleWebBooking } from '@/src/lib/rescheduleWebBooking'

const PayloadSchema = z
  .object({
    scheduledAt: z.string().datetime(),
    pickupLocationId: z.string().uuid().optional(),
    customAddressText: z.string().min(2).max(500).optional(),
    notifyCustomer: z.boolean().optional(),
  })
  .refine(
    (data) => !data.pickupLocationId || !data.customAddressText,
    'Use either pickupLocationId or customAddressText',
  )

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params

  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof PayloadSchema.safeParse>
    try {
      parsed = PayloadSchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const repo = await getRepo('WebBooking')
    const booking = await repo.findOne({
      where: { id },
      relations: { location: true, customAddress: true },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    try {
      const updated = await rescheduleWebBooking(booking, {
        scheduledAt: new Date(parsed.data.scheduledAt),
        pickupLocationId: parsed.data.pickupLocationId,
        customAddressText: parsed.data.customAddressText,
        notifyCustomer: parsed.data.notifyCustomer,
      })

      return NextResponse.json({
        ok: true,
        bookingId: updated.id,
        publicNumber: updated.publicNumber,
        scheduledAt: updated.scheduledAt.toISOString(),
        locationId: updated.locationId,
        customAddressId: updated.customAddressId,
        status: updated.status,
        updatedAt: updated.updatedAt.getTime(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reschedule failed'
      const status = message.includes('not found') ? 404 : 409
      return NextResponse.json({ error: message }, { status })
    }
  })
}
