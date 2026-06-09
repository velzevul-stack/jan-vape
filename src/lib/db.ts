import 'reflect-metadata'
import { DataSource, type Repository } from 'typeorm'
import { ProductSnapshot } from '../entities/ProductSnapshot'
import { PickupLocation } from '../entities/PickupLocation'
import { CustomAddress } from '../entities/CustomAddress'
import { DeliveryZone } from '../entities/DeliveryZone'
import { WebBooking } from '../entities/WebBooking'
import { WebSale } from '../entities/WebSale'
import { BlockedSlot } from '../entities/BlockedSlot'
import { SyncCursor } from '../entities/SyncCursor'
import { IdempotencyKey } from '../entities/IdempotencyKey'
import { NotificationOutbox } from '../entities/NotificationOutbox'
import { AppAlert } from '../entities/AppAlert'
import { TelegramCustomer } from '../entities/TelegramCustomer'
import { VerificationToken } from '../entities/VerificationToken'

export const entityRegistry = {
  ProductSnapshot,
  PickupLocation,
  CustomAddress,
  DeliveryZone,
  WebBooking,
  WebSale,
  BlockedSlot,
  SyncCursor,
  IdempotencyKey,
  NotificationOutbox,
  AppAlert,
  TelegramCustomer,
  VerificationToken,
} as const

export const entityTableNames = {
  ProductSnapshot: 'product_snapshots',
  PickupLocation: 'pickup_locations',
  CustomAddress: 'custom_addresses',
  DeliveryZone: 'delivery_zones',
  WebBooking: 'web_bookings',
  WebSale: 'web_sales',
  BlockedSlot: 'blocked_slots',
  SyncCursor: 'sync_cursors',
  IdempotencyKey: 'idempotency_keys',
  NotificationOutbox: 'notification_outbox',
  AppAlert: 'app_alerts',
  TelegramCustomer: 'telegram_customers',
  VerificationToken: 'verification_tokens',
} as const

export type EntityKey = keyof typeof entityRegistry

export type EntityInstance<K extends EntityKey> = InstanceType<(typeof entityRegistry)[K]>

const entities = Object.values(entityRegistry)

declare global {
  var __dataSource: DataSource | undefined
}

function resolveDatabaseSsl(databaseUrl: string): false | { rejectUnauthorized: boolean } {
  const override = process.env.DATABASE_SSL?.trim().toLowerCase()
  if (override === 'false' || override === '0' || override === 'no') {
    return false
  }
  if (override === 'true' || override === '1' || override === 'yes') {
    return { rejectUnauthorized: false }
  }

  const localHost =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('@postgres:')

  if (localHost) {
    return false
  }

  const needsSsl =
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('sslmode=verify-full')

  return needsSsl ? { rejectUnauthorized: false } : false
}

function createDataSource(): DataSource {
  const url = process.env.DATABASE_URL ?? ''

  return new DataSource({
    type: 'postgres',
    url,
    ssl: resolveDatabaseSsl(url),
    entities,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  })
}

async function runMigrations(ds: DataSource): Promise<void> {
  const runner = ds.createQueryRunner()
  try {
    await runner.connect()
    const table = await runner.getTable('product_snapshots')
    if (!table) return

    if (table.findColumnByName('sortOrder')) return

    if (table.findColumnByName('sort_order')) {
      await runner.query(
        'ALTER TABLE product_snapshots RENAME COLUMN sort_order TO "sortOrder"',
      )
      return
    }

    await runner.query(
      'ALTER TABLE product_snapshots ADD COLUMN "sortOrder" integer NOT NULL DEFAULT 0',
    )
  } catch (err) {
    console.error('product_snapshots sortOrder migration failed', err)
  } finally {
    await runner.release()
  }
}

export async function getDataSource(): Promise<DataSource> {
  if (global.__dataSource && global.__dataSource.isInitialized) {
    return global.__dataSource
  }

  const ds = createDataSource()
  await ds.initialize()
  await runMigrations(ds)
  global.__dataSource = ds
  return ds
}

export async function getRepo<K extends EntityKey>(
  key: K,
): Promise<Repository<EntityInstance<K>>> {
  const ds = await getDataSource()
  return ds.getRepository(entityTableNames[key]) as Repository<EntityInstance<K>>
}

export async function getEntityManager() {
  const ds = await getDataSource()
  return ds.manager
}
