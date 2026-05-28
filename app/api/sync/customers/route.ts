import { NextRequest, NextResponse } from 'next/server'
import { withSyncAuth } from '@/src/lib/sync/syncAuth'
import { getCustomerById, listCustomers } from '@/src/lib/customerStats'

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withSyncAuth(req, async () => {
    const customerId = req.nextUrl.searchParams.get('id')
    if (customerId) {
      const customer = await getCustomerById(customerId)
      if (!customer) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ customer })
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)
    const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
    const search = req.nextUrl.searchParams.get('search')

    const result = await listCustomers({ limit, offset, search })
    return NextResponse.json(result)
  })
}
