import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const eq = trimmed.indexOf('=')
  if (eq <= 0) return null
  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

export function loadDevEnv(): void {
  const root = join(__dirname, '..')
  const candidates = ['.env.local', '.env']
  for (const file of candidates) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value
      }
    }
    break
  }

  if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = 'development'
  }

  const url = process.env.DATABASE_URL?.trim() ?? ''
  if (!url) {
    console.error('')
    console.error('DATABASE_URL не задан.')
    console.error('Скопируйте .env.local.neon-dev → .env.local и вставьте connection string Neon,')
    console.error('или запустите: npm run dev:setup (Docker) / npm run dev:setup:neon')
    console.error('')
    process.exit(1)
  }

  if (url.includes('USER:PASSWORD') || url.includes('@HOST/')) {
    console.error('')
    console.error('DATABASE_URL — шаблон, не реальная база.')
    console.error('Вставьте connection string из Neon (отдельный dev-проект, не production).')
    console.error('')
    process.exit(1)
  }
}
