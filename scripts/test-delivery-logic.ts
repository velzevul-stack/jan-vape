import assert from 'node:assert/strict'
import {
  deliveryBusyWindow,
  halfRoundTripBlockMinutes,
  slotConflictsWithDeliveries,
} from '../src/lib/deliveryBusyWindow'
import { resolveDeliveryZone } from '../src/lib/deliveryZoneResolve'

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
