import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'jsonb', default: '[]' })
  aliases!: string[]

  @Column({ type: 'int' })
  roundTripMinutes!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee!: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
