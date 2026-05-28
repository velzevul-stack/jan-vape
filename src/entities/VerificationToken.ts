import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  token!: string

  @Column({ type: 'varchar', length: 255 })
  telegramUsername!: string

  @Column({ type: 'bigint', nullable: true })
  telegramUserId!: string | null

  @Column({ type: 'timestamptz' })
  expiresAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
