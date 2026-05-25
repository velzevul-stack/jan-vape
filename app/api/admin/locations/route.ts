import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { PickupLocation } from '@/src/entities/PickupLocation'

const LocationSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  address: z.string().max(500).default(''),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  workDayStart: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),
  workDayEnd: z.string().regex(/^\d{2}:\d{2}$/).default('21:00'),
  maxBookingsPerSlot: z.number().int().min(1).default(1),
  slotStepMinutes: z.number().int().min(1).max(60).default(5),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const repo = await getRepo('PickupLocation')
  const locations = await repo.find({ order: { sortOrder: 'ASC' } })
  return NextResponse.json({ locations })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const body = await req.json()
  const parsed = LocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }
  const repo = await getRepo('PickupLocation')
  const loc = repo.create(parsed.data)
  await repo.save(loc)
  revalidatePath('/admin/locations')
  revalidatePath('/')
  return NextResponse.json(loc, { status: 201 })
}
