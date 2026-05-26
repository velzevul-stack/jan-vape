import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('notification_outbox')
export class NotificationOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  endpoint!: string

  @Column({ type: 'jsonb' })
  payload!: unknown

  @Column({ type: 'int', default: 0 })
  attempts!: number

  @Column({ type: 'text', nullable: true })
  lastError!: string | null

  @Index()
  @Column({ type: 'timestamptz' })
  nextRetryAt!: Date

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
