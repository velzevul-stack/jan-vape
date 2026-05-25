export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type LocationRow = {
  id: string
  code: string
  name: string
  address: string
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  workDayStart: string
  workDayEnd: string
  maxBookingsPerSlot: number
  slotStepMinutes: number
}

export type AddressRow = {
  id: string
  label: string
  salesCount: number
  isPromoted: boolean
  createdAt: string
}

export type BlockedSlotRow = {
  id: string
  locationId: string | null
  locationName: string | null
  customAddressLabel: string | null
  startsAt: string
  endsAt: string
  reason: string | null
  isPast: boolean
}

export type BookingRow = {
  id: string
  publicNumber: string
  customerName: string
  customerTelegram: string
  placeLabel: string
  scheduledAt: string
  totalAmount: number
  status: BookingStatus
  itemsCount: number
}

export type LocationOption = {
  id: string
  name: string
  code: string
}
