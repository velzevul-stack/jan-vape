import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PickupLocation } from './PickupLocation'
import { CustomAddress } from './CustomAddress'
import { DeliveryZone } from './DeliveryZone'

export type WebBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type WebBookingSource = 'web' | 'app'
export type CancelledFromStatus = 'pending' | 'confirmed'

@Entity('web_bookings')
export class WebBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  publicNumber!: string

  @Column({ type: 'varchar', length: 10, default: 'web' })
  source!: WebBookingSource

  @Column({ type: 'varchar', length: 255 })
  customerName!: string

  @Column({ type: 'varchar', length: 255 })
  customerTelegram!: string

  @Column({ type: 'text', nullable: true })
  comment!: string | null

  @Column({ type: 'timestamptz' })
  scheduledAt!: Date

  @Column({ type: 'uuid', nullable: true })
  locationId!: string | null

  @ManyToOne(() => PickupLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location!: PickupLocation | null

  @Column({ type: 'uuid', nullable: true })
  customAddressId!: string | null

  @ManyToOne(() => CustomAddress, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customAddressId' })
  customAddress!: CustomAddress | null

  @Column({ type: 'uuid', nullable: true })
  deliveryZoneId!: string | null

  @ManyToOne(() => DeliveryZone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliveryZoneId' })
  deliveryZone!: DeliveryZone | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee!: number

  @Column({ type: 'int', nullable: true })
  roundTripMinutes!: number | null

  @Column({ type: 'jsonb', default: '[]' })
  items!: Array<{
    productId: string
    quantity: number
    retailPriceSnapshot: number
  }>

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: WebBookingStatus

  @Column({ type: 'varchar', length: 20, nullable: true })
  cancelledFromStatus!: CancelledFromStatus | null

  @Column({ type: 'int', nullable: true })
  appReservationId!: number | null

  @Column({ type: 'timestamptz', nullable: true })
  syncedToAppAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}
