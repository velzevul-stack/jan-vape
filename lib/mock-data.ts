export interface Product {
  id: string
  externalId?: number
  brand: string
  flavor: string
  category: 'liquid' | 'snus' | 'disposable'
  strength: number
  tasteProfile: string
  retailPrice: number
  availableOnPost: number
  image?: string
}

export interface PickupLocation {
  id: string
  code: string
  name: string
  address: string
  isFeatured?: boolean
  workDayStart: string
  workDayEnd: string
}

export interface PromotedAddress {
  id: string
  label: string
  salesCount: number
}

export interface TimeSlot {
  time: string
  available: boolean
  reason?: 'busy' | 'blocked' | 'past'
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Booking {
  publicNumber: string
  bookingId: string
  customerName: string
  customerTelegram: string
  comment?: string
  pickupLocationId?: string
  customAddressText?: string
  scheduledAt: string
  items: CartItem[]
  total: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
}

export function getAvailableDates(days = 14): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }
  return dates
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-BY', {
    style: 'currency',
    currency: 'BYN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

export const categoryLabels: Record<Product['category'], string> = {
  liquid: 'Жидкости',
  snus: 'Снюс',
  disposable: 'Одноразки',
}
