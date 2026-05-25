import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'

@Entity('custom_addresses')
export class CustomAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 500 })
  normalizedKey!: string

  @Column({ type: 'varchar', length: 500 })
  label!: string

  @Column({ type: 'int', default: 0 })
  salesCount!: number

  @Column({ type: 'boolean', default: false })
  isPromoted!: boolean

  @Column({ type: 'timestamptz', nullable: true })
  promotedAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
