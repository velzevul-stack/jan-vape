import { getRepo } from './db'
import type { ProductSnapshot } from '../entities/ProductSnapshot'

export async function getAvailableOnPost(productId: string): Promise<number> {
  const productRepo = await getRepo('ProductSnapshot')
  const product = await productRepo.findOne({ where: { id: productId } })
  if (!product) return 0

  const bookingRepo = await getRepo('WebBooking')
  const activeBookings = await bookingRepo
    .createQueryBuilder('wb')
    .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
    .andWhere('wb.scheduledAt > NOW()')
    .getMany()

  const reservedQty = activeBookings.reduce((sum, booking) => {
    const item = booking.items.find((i) => i.productId === productId)
    return sum + (item ? item.quantity : 0)
  }, 0)

  return Math.max(0, product.postStock - reservedQty)
}

export async function getAvailabilityMap(
  products: ProductSnapshot[],
): Promise<Map<string, number>> {
  if (products.length === 0) return new Map()

  const bookingRepo = await getRepo('WebBooking')
  const activeBookings = await bookingRepo
    .createQueryBuilder('wb')
    .where('wb.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
    .andWhere('wb.scheduledAt > NOW()')
    .getMany()

  const map = new Map<string, number>()
  for (const product of products) {
    const reservedQty = activeBookings.reduce((sum, booking) => {
      const item = booking.items.find((i) => i.productId === product.id)
      return sum + (item ? item.quantity : 0)
    }, 0)
    map.set(product.id, Math.max(0, product.postStock - reservedQty))
  }

  return map
}
