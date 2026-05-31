import type { ObjectLiteral, Repository } from 'typeorm'
import type { BlockedSlot } from '@/src/entities/BlockedSlot'

export function intervalsOverlap(
  slotStart: Date,
  slotEnd: Date,
  blockedStart: Date,
  blockedEnd: Date,
): boolean {
  return slotStart < blockedEnd && blockedStart < slotEnd
}

export function isBlockedByInterval(
  slotStart: Date,
  slotEnd: Date,
  blockedSlots: BlockedSlot[],
): boolean {
  return blockedSlots.some((blocked) =>
    intervalsOverlap(
      slotStart,
      slotEnd,
      new Date(blocked.startsAt),
      new Date(blocked.endsAt),
    ),
  )
}

export function isScheduledAtBlocked(
  scheduledAt: Date,
  blockedSlots: BlockedSlot[],
  slotStepMinutes = 5,
): boolean {
  const slotEnd = new Date(scheduledAt.getTime() + slotStepMinutes * 60 * 1000)
  return isBlockedByInterval(scheduledAt, slotEnd, blockedSlots)
}

export async function findBlockedSlotsForPickup(
  blockedRepo: Repository<ObjectLiteral>,
  dayStart: Date,
  dayEnd: Date,
  locationId: string,
): Promise<BlockedSlot[]> {
  return blockedRepo
    .createQueryBuilder('bs')
    .where('bs.startsAt <= :end AND bs.endsAt >= :start', {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    })
    .andWhere(
      '(bs.locationId = :locationId OR (bs.locationId IS NULL AND bs.customAddressId IS NULL))',
      { locationId },
    )
    .getMany() as Promise<BlockedSlot[]>
}

export async function findGlobalBlockedSlots(
  blockedRepo: Repository<ObjectLiteral>,
  dayStart: Date,
  dayEnd: Date,
): Promise<BlockedSlot[]> {
  return blockedRepo
    .createQueryBuilder('bs')
    .where('bs.startsAt <= :end AND bs.endsAt >= :start', {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    })
    .andWhere('bs.locationId IS NULL AND bs.customAddressId IS NULL')
    .getMany() as Promise<BlockedSlot[]>
}
