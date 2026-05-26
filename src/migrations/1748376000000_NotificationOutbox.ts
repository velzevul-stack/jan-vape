import { MigrationInterface, QueryRunner } from 'typeorm'

export class NotificationOutbox1748376000000 implements MigrationInterface {
  name = 'NotificationOutbox1748376000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_outbox" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "endpoint" text NOT NULL,
        "payload" jsonb NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "nextRetryAt" timestamptz NOT NULL,
        "deliveredAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notification_outbox_next_retry" ON "notification_outbox" ("nextRetryAt")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notification_outbox_delivered_at" ON "notification_outbox" ("deliveredAt")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_outbox_delivered_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_outbox_next_retry"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_outbox"`)
  }
}
