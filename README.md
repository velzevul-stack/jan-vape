# jan-vape-suite

Next.js backend и сайт бронирования Jan-Vape.

## Миграции

В dev-среде TypeORM создаёт таблицы через `synchronize`. В production таблицу `notification_outbox` нужно создать вручную:

```bash
psql "$DATABASE_URL" -f scripts/migrate-notification-outbox.sql
```

Env для webhook-уведомлений ботов: `NOTIFY_WEBHOOK_SHOP_KEY`, `NOTIFY_WEBHOOK_HMAC_SECRET` (см. `.env.local.example`).

## Локальная разработка

Фронт: `npm run dev` → http://localhost:3000. Данные БД на VPS не попадают (`.env.local` в gitignore).

### Вариант A — без Docker (если нет virtualization)

Подходит, когда Docker пишет *Virtualization support not detected*.

1. Создайте **отдельный** проект или branch в [Neon](https://neon.tech) (не production).
2. В PowerShell:

```powershell
cd jan-vape-suite
$env:NEON_DEV_DATABASE_URL="postgresql://..."
npm run dev:setup:neon
npm run dev
```

Повторный seed: `npm run dev:seed` (с тем же `DATABASE_URL` в `.env.local`).

### Вариант B — Docker Postgres (если VT-x включён)

```powershell
cd jan-vape-suite
npm run dev:setup
npm run dev
```

БД на порту **54329**. Остановить: `npm run dev:db:down`.

Шаблоны env: `.env.local.neon-dev`, `.env.local.dev`.

Полная документация: `obsidian-vault/projects/vapestore/`.
