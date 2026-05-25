import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { withIdempotency } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { WebSale } from '@/src/entities/WebSale'
import { CustomAddress } from '@/src/entities/CustomAddress'
import { PickupLocation } from '@/src/entities/PickupLocation'
import { normalizeAddress } from '@/src/lib/normalize'

const PROMOTE_THRESHOLD = 10

const SaleSchema = z.object({
  externalSaleId: z.number().int().positive(),
  externalProductId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  revenue: z.number().min(0),
  place: z.string().max(500).optional(),
  saleDate: z.number().int(),
})

const BodySchema = z.object({
  idempotencyKey: z.string().min(1).max(255),
  sales: z.array(SaleSchema).min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async (rawBody) => {
    let parsed: ReturnType<typeof BodySchema.safeParse>
    try {
      parsed = BodySchema.safeParse(JSON.parse(rawBody))
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
    }

    const { idempotencyKey, sales } = parsed.data

    return withIdempotency(idempotencyKey, async () => {
      const saleRepo = await getRepo(WebSale)
      const addrRepo = await getRepo(CustomAddress)
      const locRepo = await getRepo(PickupLocation)

      let saved = 0

      for (const s of sales) {
        const exists = await saleRepo.findOne({ where: { externalSaleId: s.externalSaleId } })
        if (exists) continue

        let locationId: string | null = null
        let customAddressId: string | null = null

        if (s.place) {
          const loc = await locRepo
            .createQueryBuilder('l')
            .where('LOWER(l.name) = LOWER(:name)', { name: s.place.trim() })
            .getOne()

          if (loc) {
            locationId = loc.id
          } else {
            const key = normalizeAddress(s.place)
            let addr = await addrRepo.findOne({ where: { normalizedKey: key } })
            if (!addr) {
              addr = addrRepo.create({
                normalizedKey: key,
                label: s.place.trim(),
                salesCount: 0,
                isPromoted: false,
              })
              await addrRepo.save(addr)
            }

            await addrRepo.increment({ id: addr.id }, 'salesCount', 1)
            const updated = await addrRepo.findOne({ where: { id: addr.id } })

            if (updated && !updated.isPromoted && updated.salesCount >= PROMOTE_THRESHOLD) {
              await addrRepo.update(updated.id, {
                isPromoted: true,
                promotedAt: new Date(),
              })
            }

            customAddressId = addr.id
          }
        }

        await saleRepo.save(
          saleRepo.create({
            externalSaleId: s.externalSaleId,
            externalProductId: s.externalProductId,
            quantity: s.quantity,
            revenue: s.revenue,
            locationId,
            customAddressId,
            saleDate: new Date(s.saleDate),
          }),
        )
        saved++
      }

      return { status: 200, body: { saved } }
    })
  })
}
