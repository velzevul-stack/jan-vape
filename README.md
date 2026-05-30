# jan-vape-suite

Next.js backend и сайт бронирования Jan-Vape.

## Миграции

В dev-среде TypeORM создаёт таблицы через `synchronize`. В production таблицу `notification_outbox` нужно создать вручную:

```bash
psql "$DATABASE_URL" -f scripts/migrate-notification-outbox.sql
```

Env для webhook-уведомлений ботов: `NOTIFY_WEBHOOK_SHOP_KEY`, `NOTIFY_WEBHOOK_HMAC_SECRET` (см. `.env.local.example`).

## Локальная разработка (Docker Postgres)

```powershell
cd jan-vape-suite
npm run dev:setup
npm run dev
```

Сайт: http://localhost:3000 — локальная БД на порту **54329**, данные не уходят на VPS.

Повторный seed: `npm run dev:seed`. Остановить БД: `npm run dev:db:down`.

Шаблон env: `.env.local.dev` → копируется в `.env.local` (gitignore).

Полная документация: `obsidian-vault/projects/vapestore/`.
