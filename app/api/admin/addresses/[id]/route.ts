import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyBasicAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'
import { CustomAddress } from '@/src/entities/CustomAddress'

const PatchSchema = z.object({
  isPromoted: z.boolean(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!verifyBasicAuth(req)) return unauthorizedResponse()
  const { id } = await params
  const repo = await getRepo('CustomAddress')
  const addr = await repo.findOne({ where: { id } })
  if (!addr) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }
  await repo.update(addr.id, {
    isPromoted: parsed.data.isPromoted,
    promotedAt: parsed.data.isPromoted ? new Date() : null,
  })
  revalidatePath('/admin/addresses')
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
