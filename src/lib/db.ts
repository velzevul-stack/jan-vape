import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { ProductSnapshot } from '../entities/ProductSnapshot'
import { PickupLocation } from '../entities/PickupLocation'
import { CustomAddress } from '../entities/CustomAddress'
import { WebBooking } from '../entities/WebBooking'
import { WebSale } from '../entities/WebSale'
import { BlockedSlot } from '../entities/BlockedSlot'
import { SyncCursor } from '../entities/SyncCursor'
import { IdempotencyKey } from '../entities/IdempotencyKey'

const entities = [
  ProductSnapshot,
  PickupLocation,
  CustomAddress,
  WebBooking,
  WebSale,
  BlockedSlot,
  SyncCursor,
  IdempotencyKey,
]

declare global {
  var __dataSource: DataSource | undefined
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    entities,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    migrations: ['src/migrations/*.ts'],
  })
}

export async function getDataSource(): Promise<DataSource> {
  if (global.__dataSource && global.__dataSource.isInitialized) {
    return global.__dataSource
  }

  const ds = createDataSource()
  await ds.initialize()
  global.__dataSource = ds
  return ds
}

export async function getRepo<T extends object>(
  entity: new () => T,
): Promise<import('typeorm').Repository<T>> {
  const ds = await getDataSource()
  return ds.getRepository(entity)
}
