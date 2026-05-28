import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyBasicAuth, verifySyncAuth, unauthorizedResponse } from '@/src/lib/auth'
import { getRepo } from '@/src/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const isBasic = verifyBasicAuth(req)
  const isHmac = !isBasic && verifySyncAuth(req, '')
  if (!isBasic && !isHmac) return unauthorizedResponse()
  const { id } = await params
  const repo = await getRepo('BlockedSlot')
  const slot = await repo.findOne({ where: { id } })
  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await repo.delete(slot.id)

  revalidatePath('/admin/blocked-slots')
  revalidatePath('/')

  return NextResponse.json({ ok: true })
}
