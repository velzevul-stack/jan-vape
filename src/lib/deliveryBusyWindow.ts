const SLOT_STEP_MINUTES = 5

export function halfRoundTripBlockMinutes(roundTripMinutes: number): number {
  const half = roundTripMinutes / 2
  return Math.ceil(half / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES
}

export interface BusyWindow {
  startMs: number
  endMs: number
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

export function slotConflictsWithDeliveries(
  slotStart: Date,
  requestedRoundTripMinutes: number,
  existing: Array<{ scheduledAt: Date; roundTripMinutes: number }>,
): boolean {
  const candidate = deliveryBusyWindow(slotStart, requestedRoundTripMinutes)
  return existing.some((booking) =>
    busyWindowsOverlap(candidate, deliveryBusyWindow(booking.scheduledAt, booking.roundTripMinutes)),
  )
}

export function isSlotTooSoon(slotStart: Date, requestedRoundTripMinutes: number, now: Date): boolean {
  const effectiveMinutes = halfRoundTripBlockMinutes(requestedRoundTripMinutes)
  return slotStart.getTime() - effectiveMinutes * 60_000 < now.getTime()
}
