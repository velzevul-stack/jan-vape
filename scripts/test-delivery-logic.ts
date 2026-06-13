import assert from 'node:assert/strict'
import {
  deliveryBusyWindow,
  halfRoundTripBlockMinutes,
  slotConflictsWithDeliveries,
} from '../src/lib/deliveryBusyWindow'
import {
  buildZoneMinutesMap,
  buildZoneSingleSlotMap,
  isDeliverySlotAvailable,
} from '../src/lib/deliverySlotGuard'
import { resolveDeliveryZone } from '../src/lib/deliveryZoneResolve'
import { isUnavailableDeliveryPlace } from '../src/lib/unavailableDeliveryPlaces'

assert.equal(halfRoundTripBlockMinutes(15), 10)
assert.equal(halfRoundTripBlockMinutes(10), 5)
assert.equal(halfRoundTripBlockMinutes(40), 20)

const center = new Date('2026-05-26T18:00:00+03:00')
const window = deliveryBusyWindow(center, 10)
assert.equal(window.startMs, center.getTime() - 5 * 60_000)
assert.equal(window.endMs, center.getTime() + 5 * 60_000)

const existing = [{
  scheduledAt: new Date('2026-05-26T18:00:00+03:00'),
  roundTripMinutes: 5,
}]
assert.equal(
  slotConflictsWithDeliveries(new Date('2026-05-26T17:55:00+03:00'), 40, existing),
  true,
)

const zoneA = 'zone-alexeyki'
const zoneB = 'zone-yaglevichi'

const alexeykiBusy = [{
  scheduledAt: new Date('2026-05-26T16:15:00+03:00'),
  roundTripMinutes: 20,
  deliveryZoneId: zoneA,
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T16:20:00+03:00'),
    20,
    alexeykiBusy,
    false,
    zoneB,
  ),
  true,
)

const alexeyki1430 = [{
  scheduledAt: new Date('2026-05-26T14:30:00+03:00'),
  roundTripMinutes: 20,
  deliveryZoneId: zoneA,
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T14:35:00+03:00'),
    20,
    alexeyki1430,
    false,
    zoneA,
  ),
  false,
)

const zoneMinutesById = buildZoneMinutesMap([
  { id: zoneA, roundTripMinutes: 20 },
])
const zoneSingleSlotById = buildZoneSingleSlotMap([
  { id: zoneA, code: 'alexeyki', name: 'Алексейки', roundTripMinutes: 20 },
])
const chainedPair = [
  {
    id: 'booking-a',
    scheduledAt: new Date('2026-05-26T14:30:00+03:00'),
    roundTripMinutes: 20,
    deliveryZoneId: zoneA,
  },
  {
    id: 'booking-b',
    scheduledAt: new Date('2026-05-26T14:35:00+03:00'),
    roundTripMinutes: 20,
    deliveryZoneId: zoneA,
  },
]
assert.equal(
  isDeliverySlotAvailable(
    new Date('2026-05-26T14:30:00+03:00'),
    20,
    chainedPair,
    zoneMinutesById,
    zoneSingleSlotById,
    zoneA,
    'booking-a',
  ),
  false,
)
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T14:25:00+03:00'),
    20,
    alexeyki1430,
    false,
    zoneB,
  ),
  true,
)

const ivatsevichiBusy = [{
  scheduledAt: new Date('2026-05-26T14:30:00+03:00'),
  roundTripMinutes: 5,
  singleSlotOnly: true,
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T14:30:00+03:00'),
    5,
    ivatsevichiBusy,
    true,
  ),
  true,
)
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T14:35:00+03:00'),
    5,
    ivatsevichiBusy,
    true,
  ),
  false,
)

const pankiBusy = [{
  scheduledAt: new Date('2026-05-26T16:15:00+03:00'),
  roundTripMinutes: 15,
  deliveryZoneId: 'zone-panki',
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T16:20:00+03:00'),
    15,
    pankiBusy,
    false,
    'zone-other',
  ),
  true,
)

const ivatsevichiZone = 'zone-ivatsevichi'
const villageDuringTrip = [{
  scheduledAt: new Date('2026-05-26T16:30:00+03:00'),
  roundTripMinutes: 20,
  deliveryZoneId: 'zone-yaglevichi',
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T16:25:00+03:00'),
    5,
    villageDuringTrip,
    true,
    ivatsevichiZone,
  ),
  true,
)
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T16:35:00+03:00'),
    5,
    villageDuringTrip,
    true,
    ivatsevichiZone,
  ),
  true,
)

const ivatsevichiAt1625 = [{
  scheduledAt: new Date('2026-05-26T16:25:00+03:00'),
  roundTripMinutes: 5,
  singleSlotOnly: true,
  deliveryZoneId: ivatsevichiZone,
}]
assert.equal(
  slotConflictsWithDeliveries(
    new Date('2026-05-26T16:30:00+03:00'),
    20,
    ivatsevichiAt1625,
    false,
    'zone-yaglevichi',
  ),
  true,
)

assert.equal(isUnavailableDeliveryPlace('санта, ул. 1'), true)
assert.equal(isUnavailableDeliveryPlace('Алексейки'), false)

const result = resolveDeliveryZone('заполье, ул. Лесная 3', [{
  id: 'z1',
  code: 'zapolye',
  name: 'Заполье',
  aliases: ['заполье'],
  roundTripMinutes: 40,
  deliveryFee: 15,
}])
assert.ok(result)
assert.equal(result?.zoneName, 'Заполье')
assert.equal(result?.confidence, 'exact')

const defaultResult = resolveDeliveryZone('ул. Ленина 5', [
  {
    id: 'z0',
    code: 'ivatevichi',
    name: 'Ивацевичи',
    aliases: ['ивцевичи'],
    roundTripMinutes: 5,
    deliveryFee: 0,
  },
  {
    id: 'z1',
    code: 'zapolye',
    name: 'Заполье',
    aliases: ['заполье'],
    roundTripMinutes: 40,
    deliveryFee: 15,
  },
])
assert.ok(defaultResult)
assert.equal(defaultResult?.zoneName, 'Ивацевичи')
assert.equal(defaultResult?.displayAddress, 'Ивацевичи, ул. Ленина 5')
assert.equal(defaultResult?.zoneId, 'z0')

console.log('delivery tests passed')
