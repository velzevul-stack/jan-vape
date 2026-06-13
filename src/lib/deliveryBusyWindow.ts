const SLOT_STEP_MINUTES = 5

export const SAME_VILLAGE_CHAIN_RETURN_MINUTES = 10

export function halfRoundTripBlockMinutes(roundTripMinutes: number): number {
  const half = roundTripMinutes / 2
  return Math.ceil(half / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES
}

export interface BusyWindow {
  startMs: number
  endMs: number
}

export interface DeliverySlotConflictInput {
  scheduledAt: Date
  roundTripMinutes: number
  singleSlotOnly?: boolean
  deliveryZoneId?: string
}

export function deliveryBusyWindow(scheduledAt: Date, roundTripMinutes: number): BusyWindow {
  const blockMinutes = halfRoundTripBlockMinutes(roundTripMinutes)
  const centerMs = scheduledAt.getTime()
  const blockMs = blockMinutes * 60_000
  return {
    startMs: centerMs - blockMs,
    endMs: centerMs + blockMs,
  }
}

export function busyWindowsOverlap(a: BusyWindow, b: BusyWindow): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs
}

function slotIntervalForStart(slotStart: Date): BusyWindow {
  const startMs = slotStart.getTime()
  return {
    startMs,
    endMs: startMs + SLOT_STEP_MINUTES * 60_000,
  }
}

function bookingInSlotInterval(slotStart: Date, bookingAt: Date): boolean {
  const interval = slotIntervalForStart(slotStart)
  const bkMs = bookingAt.getTime()
  return bkMs >= interval.startMs && bkMs < interval.endMs
}

function isSameDeliveryZone(a?: string, b?: string): boolean {
  return a != null && b != null && a.length > 0 && a === b
}

export function isChainedSameVillageDelivery(
  scheduledAt: Date,
  zoneId: string | undefined,
  all: DeliverySlotConflictInput[],
): boolean {
  if (!zoneId) return false
  const atMs = scheduledAt.getTime()
  return all.some((other) => {
    if (other.singleSlotOnly || !isSameDeliveryZone(other.deliveryZoneId, zoneId)) {
      return false
    }
    const otherMs = other.scheduledAt.getTime()
    if (otherMs >= atMs) return false
    const gapMs = atMs - otherMs
    return gapMs > 0 && gapMs <= other.roundTripMinutes * 60_000
  })
}

export function bookingBusyWindow(
  booking: DeliverySlotConflictInput,
  all: DeliverySlotConflictInput[],
): BusyWindow {
  if (booking.singleSlotOnly) {
    return slotIntervalForStart(booking.scheduledAt)
  }
  if (isChainedSameVillageDelivery(booking.scheduledAt, booking.deliveryZoneId, all)) {
    const startMs = booking.scheduledAt.getTime()
    return {
      startMs,
      endMs: startMs + SAME_VILLAGE_CHAIN_RETURN_MINUTES * 60_000,
    }
  }
  return deliveryBusyWindow(booking.scheduledAt, booking.roundTripMinutes)
}

export function slotConflictsWithDeliveries(
  slotStart: Date,
  requestedRoundTripMinutes: number,
  existing: DeliverySlotConflictInput[],
  requestedSingleSlotOnly = false,
  requestedZoneId?: string,
): boolean {
  const candidate: DeliverySlotConflictInput = {
    scheduledAt: slotStart,
    roundTripMinutes: requestedRoundTripMinutes,
    singleSlotOnly: requestedSingleSlotOnly,
    deliveryZoneId: requestedZoneId,
  }
  const allBookings = [...existing, candidate]

  return existing.some((booking) => {
    if (
      isSameDeliveryZone(booking.deliveryZoneId, requestedZoneId) &&
      !booking.singleSlotOnly &&
      !requestedSingleSlotOnly &&
      booking.scheduledAt.getTime() < slotStart.getTime()
    ) {
      return false
    }

    const existingSingle = booking.singleSlotOnly === true

    if (requestedSingleSlotOnly && existingSingle) {
      return bookingInSlotInterval(slotStart, booking.scheduledAt)
    }

    const candidateWindow = requestedSingleSlotOnly
      ? slotIntervalForStart(slotStart)
      : bookingBusyWindow(candidate, allBookings)
    const existingWindow = existingSingle
      ? slotIntervalForStart(booking.scheduledAt)
      : bookingBusyWindow(booking, allBookings)
    return busyWindowsOverlap(candidateWindow, existingWindow)
  })
}

export function isSlotTooSoon(
  slotStart: Date,
  requestedRoundTripMinutes: number,
  now: Date,
  requestedSingleSlotOnly = false,
  requestedZoneId?: string,
  existing: DeliverySlotConflictInput[] = [],
): boolean {
  const chained =
    !requestedSingleSlotOnly &&
    isChainedSameVillageDelivery(slotStart, requestedZoneId, existing)
  const effectiveMinutes = requestedSingleSlotOnly
    ? SLOT_STEP_MINUTES
    : chained
      ? SAME_VILLAGE_CHAIN_RETURN_MINUTES
      : halfRoundTripBlockMinutes(requestedRoundTripMinutes)
  return slotStart.getTime() - effectiveMinutes * 60_000 < now.getTime()
}
