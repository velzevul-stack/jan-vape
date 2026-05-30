import 'reflect-metadata'
import { getDataSource, getRepo } from '../src/lib/db'
import { DELIVERY_ZONE_SEEDS } from '../src/lib/deliveryZonesSeed'
import { normalizeAddress } from '../src/lib/normalize'

const PICKUP_LOCATIONS = [
  {
    code: 'shop',
    name: 'Магазин центр',
    address: 'г. Ивацевичи, ул. Советская 12',
    isActive: true,
    isFeatured: true,
    sortOrder: 0,
    workDayStart: '10:00',
    workDayEnd: '21:00',
    maxBookingsPerSlot: 2,
    slotStepMinutes: 5,
  },
  {
    code: 'post',
    name: 'Пост склад',
    address: 'г. Ивацевичи, ул. Промышленная 3',
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    workDayStart: '10:00',
    workDayEnd: '21:00',
    maxBookingsPerSlot: 1,
    slotStepMinutes: 5,
  },
]

const PROMOTED_ADDRESSES = [
  'Майск, ул. Центральная 5',
  'Михновичи, д. 12',
  'г. Ивацевичи, ул. Ленина 8',
]

type ProductSeed = {
  externalId: number
  brand: string
  flavor: string
  category: string
  strength: string
  tasteProfile: string
  retailPrice: number
  postStock: number
}

const PRODUCTS: ProductSeed[] = [
  { externalId: 1001, brand: 'Elf Bar', flavor: 'Watermelon', category: 'disposable', strength: '0', tasteProfile: 'фруктовый', retailPrice: 18, postStock: 12 },
  { externalId: 1002, brand: 'Elf Bar', flavor: 'Blue Razz', category: 'disposable', strength: '0', tasteProfile: 'ягодный', retailPrice: 18, postStock: 8 },
  { externalId: 1003, brand: 'Lost Mary', flavor: 'Grape', category: 'disposable', strength: '0', tasteProfile: 'фруктовый', retailPrice: 19, postStock: 6 },
  { externalId: 1004, brand: 'HQD', flavor: 'Mango', category: 'disposable', strength: '0', tasteProfile: 'тропический', retailPrice: 15, postStock: 15 },
  { externalId: 1005, brand: 'Vozol', flavor: 'Peach Ice', category: 'disposable', strength: '0', tasteProfile: 'фруктовый,холодок', retailPrice: 20, postStock: 4 },
  { externalId: 2001, brand: 'Chaser', flavor: 'Blackcurrant', category: 'liquid', strength: '3', tasteProfile: 'ягодный', retailPrice: 12, postStock: 20 },
  { externalId: 2002, brand: 'Chaser', flavor: 'Vanilla Custard', category: 'liquid', strength: '6', tasteProfile: 'десертный', retailPrice: 12, postStock: 18 },
  { externalId: 2003, brand: 'Chaser', flavor: 'Tobacco', category: 'liquid', strength: '12', tasteProfile: 'табачный', retailPrice: 12, postStock: 10 },
  { externalId: 2004, brand: 'Monarch', flavor: 'Strawberry', category: 'liquid', strength: '3', tasteProfile: 'ягодный', retailPrice: 14, postStock: 14 },
  { externalId: 2005, brand: 'Monarch', flavor: 'Mint', category: 'liquid', strength: '6', tasteProfile: 'освежающий,холодок', retailPrice: 14, postStock: 9 },
  { externalId: 2006, brand: 'Monarch', flavor: 'Honey', category: 'liquid', strength: '0', tasteProfile: 'десертный', retailPrice: 14, postStock: 7 },
  { externalId: 2007, brand: 'Basix', flavor: 'Apple', category: 'liquid', strength: '3', tasteProfile: 'фруктовый', retailPrice: 11, postStock: 22 },
  { externalId: 2008, brand: 'Basix', flavor: 'Cherry Cola', category: 'liquid', strength: '6', tasteProfile: 'напитки', retailPrice: 11, postStock: 16 },
  { externalId: 2009, brand: 'Basix', flavor: 'Lemon Tart', category: 'liquid', strength: '0', tasteProfile: 'десертный,цитрусовый', retailPrice: 11, postStock: 11 },
  { externalId: 2010, brand: 'Red', flavor: 'Energy', category: 'liquid', strength: '12', tasteProfile: 'напитки', retailPrice: 10, postStock: 13 },
  { externalId: 3001, brand: 'Siberia', flavor: 'Original', category: 'snus', strength: '43', tasteProfile: 'табачный,холодок', retailPrice: 16, postStock: 25 },
  { externalId: 3002, brand: 'Siberia', flavor: 'Blue', category: 'snus', strength: '24', tasteProfile: 'холодок', retailPrice: 16, postStock: 20 },
  { externalId: 3003, brand: 'Oden\'s', flavor: 'Cold', category: 'snus', strength: '16', tasteProfile: 'табачный,холодок', retailPrice: 9, postStock: 30 },
  { externalId: 3004, brand: 'Oden\'s', flavor: 'Double Mint', category: 'snus', strength: '9', tasteProfile: 'освежающий', retailPrice: 9, postStock: 28 },
  { externalId: 3005, brand: 'Killa', flavor: 'Cold Mint', category: 'snus', strength: '16', tasteProfile: 'холодок', retailPrice: 13, postStock: 17 },
  { externalId: 3006, brand: 'Killa', flavor: 'Pineapple', category: 'snus', strength: '12', tasteProfile: 'тропический', retailPrice: 13, postStock: 12 },
  { externalId: 4001, brand: 'Vaporesso', flavor: 'XROS 3', category: 'vape', strength: '', tasteProfile: '', retailPrice: 85, postStock: 3 },
  { externalId: 4002, brand: 'GeekVape', flavor: 'Aegis Boost', category: 'vape', strength: '', tasteProfile: '', retailPrice: 95, postStock: 2 },
  { externalId: 5001, brand: 'GeekVape', flavor: 'Испаритель Aegis Boost 0.2', category: 'consumable', strength: '', tasteProfile: '', retailPrice: 13, postStock: 10 },
  { externalId: 5002, brand: 'Vaporesso', flavor: 'XROS картридж 0.6', category: 'consumable', strength: '', tasteProfile: '', retailPrice: 8, postStock: 15 },
  { externalId: 5003, brand: 'Vaporesso', flavor: 'XROS картридж 0.8', category: 'consumable', strength: '', tasteProfile: '', retailPrice: 8, postStock: 12 },
  { externalId: 5004, brand: 'VapeStore', flavor: 'Сменный pod пустой', category: 'consumable', strength: '', tasteProfile: '', retailPrice: 3, postStock: 50 },
]

async function main() {
  const ds = await getDataSource()

  const locationRepo = await getRepo('PickupLocation')
  const zoneRepo = await getRepo('DeliveryZone')
  const productRepo = await getRepo('ProductSnapshot')
  const addressRepo = await getRepo('CustomAddress')

  for (const item of PICKUP_LOCATIONS) {
    const existing = await locationRepo.findOne({ where: { code: item.code } })
    if (existing) {
      await locationRepo.update(existing.id, item)
    } else {
      await locationRepo.save(locationRepo.create(item))
    }
  }

  for (const seed of DELIVERY_ZONE_SEEDS) {
    const existing = await zoneRepo.findOne({ where: { code: seed.code } })
    const payload = {
      code: seed.code,
      name: seed.name,
      aliases: seed.aliases,
      roundTripMinutes: seed.roundTripMinutes,
      deliveryFee: seed.deliveryFee,
      isActive: true,
      sortOrder: seed.sortOrder,
    }
    if (existing) {
      await zoneRepo.update(existing.id, payload)
    } else {
      await zoneRepo.save(zoneRepo.create(payload))
    }
  }

  for (const product of PRODUCTS) {
    const existing = await productRepo.findOne({ where: { externalId: product.externalId } })
    const payload = {
      ...product,
      isHidden: product.category === 'vape',
    }
    if (existing) {
      await productRepo.update(existing.id, { ...payload, deletedAt: null })
    } else {
      await productRepo.save(productRepo.create(payload))
    }
  }

  for (const label of PROMOTED_ADDRESSES) {
    const key = normalizeAddress(label)
    const existing = await addressRepo.findOne({ where: { normalizedKey: key } })
    if (!existing) {
      await addressRepo.save(
        addressRepo.create({
          normalizedKey: key,
          label,
          salesCount: 12,
          isPromoted: true,
          promotedAt: new Date(),
        }),
      )
    } else if (!existing.isPromoted) {
      await addressRepo.update(existing.id, {
        isPromoted: true,
        salesCount: Math.max(existing.salesCount, 10),
        promotedAt: new Date(),
      })
    }
  }

  const [locations, zones, products, addresses] = await Promise.all([
    locationRepo.count(),
    zoneRepo.count(),
    productRepo.count({ where: { isHidden: false } }),
    addressRepo.count({ where: { isPromoted: true } }),
  ])

  console.log(`Local dev seed OK: locations=${locations}, zones=${zones}, catalogProducts=${products}, promotedAddresses=${addresses}`)
  await ds.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
