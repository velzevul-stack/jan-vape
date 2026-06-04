const SLOT_STEP_MINUTES = 5

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

export function slotConflictsWithDeliveries(
  slotStart: Date,
  requestedRoundTripMinutes: number,
  existing: DeliverySlotConflictInput[],
  requestedSingleSlotOnly = false,
): boolean {
  return existing.some((booking) => {
    const existingSingle = booking.singleSlotOnly === true
    if (requestedSingleSlotOnly || existingSingle) {
      if (requestedSingleSlotOnly && existingSingle) {
        return bookingInSlotInterval(slotStart, booking.scheduledAt)
      }
      const slotInterval = slotIntervalForStart(slotStart)
      const existingWindow = existingSingle
        ? slotIntervalForStart(booking.scheduledAt)
        : deliveryBusyWindow(booking.scheduledAt, booking.roundTripMinutes)
      return busyWindowsOverlap(slotInterval, existingWindow)
    }
    const candidate = deliveryBusyWindow(slotStart, requestedRoundTripMinutes)
    return busyWindowsOverlap(
      candidate,
      deliveryBusyWindow(booking.scheduledAt, booking.roundTripMinutes),
    )
  })
}

export function isSlotTooSoon(
  slotStart: Date,
  requestedRoundTripMinutes: number,
  now: Date,
  requestedSingleSlotOnly = false,
): boolean {
  const effectiveMinutes = requestedSingleSlotOnly
    ? SLOT_STEP_MINUTES
    : halfRoundTripBlockMinutes(requestedRoundTripMinutes)
  return slotStart.getTime() - effectiveMinutes * 60_000 < now.getTime()
}
