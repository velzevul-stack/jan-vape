import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('telegram_customers')
export class TelegramCustomer {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  telegramUsername!: string

  @Column({ type: 'bigint', nullable: true })
  telegramId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  trustedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  blockedAt!: Date | null

  @Column({ type: 'text', nullable: true })
  blockedReason!: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}
