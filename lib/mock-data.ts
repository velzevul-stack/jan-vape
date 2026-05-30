import { formatCalendarDateDisplay, formatCalendarDateISO } from './dates'

export type ProductCategory = 'liquid' | 'snus' | 'disposable' | 'vape' | 'consumable'

export interface Product {
  id: string
  externalId?: number
  brand: string
  flavor: string
  category: ProductCategory
  strength: number | string
  tasteProfile: string
  retailPrice: number
  availableOnPost: number
  specification?: string
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
  bookingsCount?: number
  reason?: 'past' | 'busy'
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
  return formatCalendarDateDisplay(date)
}

export function formatDateISO(date: Date): string {
  return formatCalendarDateISO(date)
}

export const categoryLabels: Record<ProductCategory, string> = {
  liquid: 'Жидкости',
  disposable: 'Одноразки',
  vape: 'Устройства',
  snus: 'Снюс',
  consumable: 'Расходники',
}

export const categoryLabelsShort: Record<ProductCategory, string> = {
  liquid: 'Жижи',
  disposable: '1раз.',
  consumable: 'Расход.',
  vape: 'Вейпы',
  snus: 'Снюс',
}

export const categoryOrder: ProductCategory[] = [
  'liquid',
  'disposable',
  'consumable',
  'vape',
  'snus',
]

export const strengthSupportedCategories = new Set<ProductCategory>(['liquid', 'snus'])

export function categorySupportsStrength(category: ProductCategory): boolean {
  return strengthSupportedCategories.has(category)
}

export function parseStrengthMg(value: number | string | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value).match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  const n = parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function productAvailableStock(product: Product): number {
  return product.availableOnPost ?? 0
}

export function hasTasteProfile(profile: string, taste: 'sweet' | 'sour' | 'cold'): boolean {
  return (profile ?? '').includes(taste)
}
