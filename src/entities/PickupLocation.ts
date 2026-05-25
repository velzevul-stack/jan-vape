import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('pickup_locations')
export class PickupLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 500, default: '' })
  address!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'boolean', default: true })
  isFeatured!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'varchar', length: 5, default: '10:00' })
  workDayStart!: string

  @Column({ type: 'varchar', length: 5, default: '21:00' })
  workDayEnd!: string

  @Column({ type: 'int', default: 1 })
  maxBookingsPerSlot!: number

  @Column({ type: 'int', default: 5 })
  slotStepMinutes!: number
}
