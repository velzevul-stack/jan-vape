import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm'

@Entity('sync_cursors')
export class SyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  clientId!: string

  @Column({ type: 'timestamptz', nullable: true })
  lastPulledAt!: Date | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion!: string | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastHeartbeatAt!: Date
}
