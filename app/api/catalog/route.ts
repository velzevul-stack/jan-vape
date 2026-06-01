import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRepo } from '@/src/lib/db'
import { getAvailabilityMap } from '@/src/lib/availability'
import { collectStrengthOptions } from '@/lib/catalog/productStrength'

const QuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  category: z.string().optional(),
  taste: z.string().optional(),
  strength: z.string().optional(),
  q: z.string().optional(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const { category, taste, strength, q } = parsed.data

  const repo = await getRepo('ProductSnapshot')
  const qb = repo
    .createQueryBuilder('p')
    .where('p.isHidden = false')
    .andWhere('p.deletedAt IS NULL')

  if (category) {
    const cats = category.split(',').map((c) => c.trim()).filter(Boolean)
    if (cats.length === 1) {
      qb.andWhere('p.category = :category', { category: cats[0] })
    } else if (cats.length > 1) {
      qb.andWhere('p.category IN (:...cats)', { cats })
    }
  }

  if (strength) {
    const strengths = strength.split(',').map((s) => s.trim()).filter(Boolean)
    if (strengths.length === 1) {
      qb.andWhere('p.strength = :strength', { strength: strengths[0] })
    } else if (strengths.length > 1) {
      qb.andWhere('p.strength IN (:...strengths)', { strengths })
    }
  }

  if (q) {
    qb.andWhere('(LOWER(p.brand) LIKE :q OR LOWER(p.flavor) LIKE :q)', {
      q: `%${q.toLowerCase()}%`,
    })
  }

  if (taste) {
    const tastes = taste.split(',').map((t) => t.trim()).filter(Boolean)
    if (tastes.length > 0) {
      const tasteCond = tastes
        .map((_, i) => `p.tasteProfile LIKE :taste${i}`)
        .join(' OR ')
      const tasteParams: Record<string, string> = {}
      tastes.forEach((t, i) => {
        tasteParams[`taste${i}`] = `%${t}%`
      })
      qb.andWhere(`(${tasteCond})`, tasteParams)
    }
  }

  const products = await qb.getMany()
  const availMap = await getAvailabilityMap(products)

  const result = products
    .map((p) => ({
      id: p.id,
      externalId: p.externalId,
      brand: p.brand,
      flavor: p.flavor,
      category: p.category,
      strength: p.strength,
      tasteProfile: p.tasteProfile,
      retailPrice: Number(p.retailPrice),
      availableOnPost: availMap.get(p.id) ?? 0,
      sortOrder: p.sortOrder ?? 0,
    }))
    .filter((p) => p.availableOnPost > 0)

  const strengthValues = collectStrengthOptions(
    result
      .filter((p) => p.category === 'liquid' || p.category === 'snus')
      .map((p) => ({
        brand: p.brand,
        strength: p.strength,
        specification: '',
        category: p.category as 'liquid' | 'snus',
      })),
  ).map(String)

  return NextResponse.json({ products: result, strengthValues })
}
