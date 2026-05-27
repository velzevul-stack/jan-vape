import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

export type AppAlertType = 'customer_stuck' | 'booking_cancelled_by_customer'

@Entity('app_alerts')
export class AppAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 64 })
  type!: AppAlertType

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
