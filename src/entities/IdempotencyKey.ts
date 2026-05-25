import 'reflect-metadata'
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key!: string

  @Column({ type: 'int' })
  responseStatus!: number

  @Column({ type: 'jsonb' })
  responseBody!: unknown

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
