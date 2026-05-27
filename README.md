# jan-vape-suite

Next.js backend и сайт бронирования Jan-Vape.

## Миграции

В dev-среде TypeORM создаёт таблицы через `synchronize`. В production таблицу `notification_outbox` нужно создать вручную:

```bash
psql "$DATABASE_URL" -f scripts/migrate-notification-outbox.sql
```

Env для webhook-уведомлений ботов: `NOTIFY_WEBHOOK_SHOP_KEY`, `NOTIFY_WEBHOOK_HMAC_SECRET` (см. `.env.local.example`).

Полная документация: `obsidian-vault/projects/vapestore/`.
