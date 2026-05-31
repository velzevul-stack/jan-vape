import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { updateWebBookingDeliveryAddress } from '@/src/lib/updateWebBookingDeliveryAddress'

const PayloadSchema = z.object({
  customAddressText: z.string().min(2).max(500),
  notifyCustomer: z.boolean().optional(),
})

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
      relations: { customAddress: true, deliveryZone: true },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    try {
      await updateWebBookingDeliveryAddress(booking, {
        customAddressText: parsed.data.customAddressText,
        notifyCustomer: parsed.data.notifyCustomer,
      })

      const refreshed = await repo.findOne({ where: { id } })
      if (!refreshed) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      return NextResponse.json({
        ok: true,
        bookingId: refreshed.id,
        publicNumber: refreshed.publicNumber,
        customAddressId: refreshed.customAddressId,
        status: refreshed.status,
        updatedAt: refreshed.updatedAt.getTime(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      const status = message.includes('not found')
        ? 404
        : message.includes('delivery')
          ? 422
          : 409
      return NextResponse.json({ error: message }, { status })
    }
  })
}
