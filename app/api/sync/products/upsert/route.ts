import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getRepo } from '@/src/lib/db'

const ProductSchema = z.object({
  externalId: z.number().int().positive(),
  brand: z.string().min(1).max(255),
  flavor: z.string().min(1).max(255),
  category: z.string().max(50),
  strength: z.string().max(50).default(''),
  tasteProfile: z.string().max(255).default(''),
  retailPrice: z.number().min(0),
  postStock: z.number().int().min(0),
})

const BodySchema = z.object({
  products: z.array(ProductSchema).min(1),
  reconcileMissing: z.boolean().default(false),
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

    const repo = await getRepo('ProductSnapshot')
    const incomingIds = parsed.data.products.map((p) => p.externalId)

    await Promise.all(
      parsed.data.products.map(async (p) => {
        const existing = await repo.findOne({ where: { externalId: p.externalId } })
        if (existing) {
          await repo.update(existing.id, {
            brand: p.brand,
            flavor: p.flavor,
            category: p.category,
            strength: p.strength,
            tasteProfile: p.tasteProfile,
            retailPrice: p.retailPrice,
            postStock: p.postStock,
            isHidden: false,
            deletedAt: null,
          })
        } else {
          await repo.save(
            repo.create({
              externalId: p.externalId,
              brand: p.brand,
              flavor: p.flavor,
              category: p.category,
              strength: p.strength,
              tasteProfile: p.tasteProfile,
              retailPrice: p.retailPrice,
              postStock: p.postStock,
              isHidden: false,
            }),
          )
        }
      }),
    )

    if (parsed.data.reconcileMissing) {
      await repo
        .createQueryBuilder()
        .update()
        .set({ isHidden: true })
        .where('externalId NOT IN (:...ids)', { ids: incomingIds })
        .execute()
    }

    revalidatePath('/')

    return NextResponse.json({ upserted: incomingIds.length })
  })
}
