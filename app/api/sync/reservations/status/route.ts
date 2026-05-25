import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'
import { WebBooking, WebBookingStatus } from '@/src/entities/WebBooking'

const UpdateSchema = z.object({
  updates: z.array(
    z.object({
      webBookingId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
      appReservationId: z.number().int().optional(),
    }),
  ).min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof UpdateSchema.safeParse>
    try {
      parsed = UpdateSchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const repo = await getRepo(WebBooking)
    let updated = 0

    for (const u of parsed.data.updates) {
      const booking = await repo.findOne({ where: { id: u.webBookingId } })
      if (!booking) continue

      const updateData: Partial<WebBooking> = { status: u.status as WebBookingStatus }
      if (u.appReservationId !== undefined) {
        updateData.appReservationId = u.appReservationId
        updateData.syncedToAppAt = new Date()
      }

      await repo.update(booking.id, updateData)
      updated++
    }

    if (updated > 0) {
      revalidatePath('/admin')
      revalidatePath('/admin/bookings')
    }

    return NextResponse.json({ updated })
  })
}
