import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'

@Entity('product_snapshots')
export class ProductSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'int', nullable: false })
  externalId!: number

  @Column({ type: 'varchar', length: 255 })
  brand!: string

  @Column({ type: 'varchar', length: 255 })
  flavor!: string

  @Column({ type: 'varchar', length: 50 })
  category!: string

  @Column({ type: 'varchar', length: 50, default: '' })
  strength!: string

  @Column({ type: 'varchar', length: 255, default: '' })
  tasteProfile!: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  retailPrice!: number

  @Column({ type: 'int', default: 0 })
  postStock!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: false })
  isHidden!: boolean

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null
}
