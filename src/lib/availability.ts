import type { EntityManager, Repository } from 'typeorm'
import { getRepo } from './db'
import { entityTableNames } from './db'
import type { ProductSnapshot } from '../entities/ProductSnapshot'
import type { WebBooking } from '../entities/WebBooking'

export type BookingStockItem = {
  productId: string
  quantity: number
}

export type BookingStockIssue = {
  productId: string
  requested: number
  available: number
}

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'] as const

async function loadActiveBookings(
  bookingRepo: Repository<WebBooking>,
): Promise<WebBooking[]> {
  return bookingRepo
    .createQueryBuilder('wb')
    .where('wb.status IN (:...statuses)', { statuses: [...ACTIVE_BOOKING_STATUSES] })
    .andWhere('wb.scheduledAt > NOW()')
    .getMany()
}

function reservedQtyForProduct(bookings: WebBooking[], productId: string): number {
  return bookings.reduce((sum, booking) => {
    const item = booking.items.find((i) => i.productId === productId)
    return sum + (item ? item.quantity : 0)
  }, 0)
}

export async function getAvailableOnPost(productId: string): Promise<number> {
  const productRepo = await getRepo('ProductSnapshot')
  const product = await productRepo.findOne({ where: { id: productId } })
  if (!product) return 0

  const bookingRepo = await getRepo('WebBooking')
  const activeBookings = await loadActiveBookings(bookingRepo)

  const reservedQty = reservedQtyForProduct(activeBookings, productId)
  return Math.max(0, product.postStock - reservedQty)
}

export async function getAvailabilityMap(
  products: ProductSnapshot[],
): Promise<Map<string, number>> {
  if (products.length === 0) return new Map()

  const bookingRepo = await getRepo('WebBooking')
  const activeBookings = await loadActiveBookings(bookingRepo)

  const map = new Map<string, number>()
  for (const product of products) {
    const reservedQty = reservedQtyForProduct(activeBookings, product.id)
    map.set(product.id, Math.max(0, product.postStock - reservedQty))
  }

  return map
}

export async function findBookingStockIssues(
  items: BookingStockItem[],
  manager?: EntityManager,
): Promise<BookingStockIssue[]> {
  if (items.length === 0) return []

  const productRepo = manager
    ? manager.getRepository(entityTableNames.ProductSnapshot)
    : await getRepo('ProductSnapshot')
  const bookingRepo = manager
    ? manager.getRepository(entityTableNames.WebBooking)
    : await getRepo('WebBooking')

  const productIds = Array.from(new Set(items.map((i) => i.productId)))
  const products = await productRepo
    .createQueryBuilder('p')
    .where('p.id IN (:...ids)', { ids: productIds })
    .getMany()
  const productMap = new Map(products.map((p) => [p.id, p]))

  const activeBookings = await loadActiveBookings(bookingRepo)
  const issues: BookingStockIssue[] = []

  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      issues.push({ productId: item.productId, requested: item.quantity, available: 0 })
      continue
    }
    const reservedQty = reservedQtyForProduct(activeBookings, item.productId)
    const available = Math.max(0, product.postStock - reservedQty)
    if (item.quantity > available) {
      issues.push({
        productId: item.productId,
        requested: item.quantity,
        available,
      })
    }
  }

  return issues
}
