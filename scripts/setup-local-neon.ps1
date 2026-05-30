param(
  [string]$DatabaseUrl = $env:NEON_DEV_DATABASE_URL
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Ensure-EnvLocalFromNeon {
  param([string]$Url)
  $envFile = Join-Path $Root '.env.local'
  $template = Join-Path $Root '.env.local.neon-dev'
  if (-not (Test-Path $envFile)) {
    Copy-Item $template $envFile
  }
  $lines = Get-Content $envFile
  $updated = $false
  $result = foreach ($line in $lines) {
    if ($line -match '^DATABASE_URL=') {
      $updated = $true
      "DATABASE_URL=$Url"
    } else {
      $line
    }
  }
  if (-not $updated) {
    $result = @("DATABASE_URL=$Url") + $result
  }
  Set-Content -Path $envFile -Value $result -Encoding utf8
  Write-Host 'Обновлён DATABASE_URL в .env.local'
}

if (-not $DatabaseUrl -or $DatabaseUrl -match 'USER:PASSWORD') {
  Write-Host ''
  Write-Host '=== Локальная разработка без Docker (Neon dev) ==='
  Write-Host ''
  Write-Host '1) Создайте отдельный проект или branch в Neon (НЕ production).'
  Write-Host '2) Скопируйте connection string.'
  Write-Host '3) Запустите:'
  Write-Host '   $env:NEON_DEV_DATABASE_URL="postgresql://..."; npm run dev:setup:neon'
  Write-Host ''
  Write-Host 'Или вставьте URL в .env.local вручную и выполните: npm run dev:seed'
  Write-Host ''
  exit 1
}

Ensure-EnvLocalFromNeon -Url $DatabaseUrl
$env:DATABASE_URL = $DatabaseUrl
$env:NODE_ENV = 'development'

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Write-Host 'npm ci...'
  npm ci
}

Write-Host 'Seed dev-данных в Neon...'
npm run dev:seed

Write-Host ''
Write-Host 'Готово. Запуск: npm run dev'
Write-Host 'Сайт: http://localhost:3000'
Write-Host 'Production Neon и VPS не затронуты — отдельная dev-база.'
