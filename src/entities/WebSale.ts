import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PickupLocation } from './PickupLocation'
import { CustomAddress } from './CustomAddress'

@Entity('web_sales')
export class WebSale {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'int' })
  externalSaleId!: number

  @Column({ type: 'int' })
  externalProductId!: number

  @Column({ type: 'int', default: 1 })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenue!: number

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

  @Column({ type: 'timestamptz' })
  saleDate!: Date

  @CreateDateColumn({ type: 'timestamptz' })
  syncedAt!: Date
}
