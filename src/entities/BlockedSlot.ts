import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PickupLocation } from './PickupLocation'
import { CustomAddress } from './CustomAddress'

@Entity('blocked_slots')
export class BlockedSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

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
  startsAt!: Date

  @Column({ type: 'timestamptz' })
  endsAt!: Date

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null
}
