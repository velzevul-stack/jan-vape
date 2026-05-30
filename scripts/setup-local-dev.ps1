$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$env:Path = "$machinePath;$userPath"

function Test-DockerReady {
  try {
    $null = Get-Command docker -ErrorAction Stop
    docker info *> $null
    return $true
  } catch {
    return $false
  }
}

function Ensure-EnvLocal {
  $envFile = Join-Path $Root '.env.local'
  $template = Join-Path $Root '.env.local.dev'
  if (-not (Test-Path $envFile)) {
    Copy-Item $template $envFile
    Write-Host 'Создан .env.local из .env.local.dev'
  } else {
    Write-Host '.env.local уже есть — не перезаписываю'
  }
}

function Start-DockerDatabase {
  Write-Host 'Запуск PostgreSQL (docker compose)...'
  docker compose -f docker-compose.dev.yml up -d
  Write-Host 'Ожидание готовности БД...'
  for ($i = 0; $i -lt 40; $i++) {
    $health = docker inspect -f '{{.State.Health.Status}}' jan-vape-dev-postgres 2>$null
    if ($health -eq 'healthy') { return }
    Start-Sleep -Seconds 2
  }
  throw 'PostgreSQL в Docker не поднялся за отведённое время'
}

function Install-DockerHint {
  Write-Host ''
  Write-Host '=== Docker не установлен или не запущен ==='
  Write-Host '1) Установите Docker Desktop: https://www.docker.com/products/docker-desktop/'
  Write-Host '   Или запустите установщик (если уже скачан через choco):'
  Write-Host '   C:\Temp\chocolatey\docker-desktop\4.75.0\Docker Desktop Installer.exe'
  Write-Host '2) После установки перезагрузите ПК и запустите Docker Desktop (статус Running).'
  Write-Host '3) Снова выполните: npm run dev:setup'
  Write-Host ''
  exit 1
}

if (-not (Test-DockerReady)) {
  if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host 'Пробую установить Docker Desktop через Chocolatey (может потребоваться подтверждение UAC)...'
    choco install docker-desktop -y --no-progress
  }
  if (-not (Test-DockerReady)) {
    Install-DockerHint
  }
}

Ensure-EnvLocal
Start-DockerDatabase

$env:DATABASE_URL = 'postgresql://jan:jan_dev_local@localhost:54329/jan_vape_dev'
$env:NODE_ENV = 'development'

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Write-Host 'npm ci...'
  npm ci
}

Write-Host 'Seed локальных данных...'
npm run dev:seed

Write-Host ''
Write-Host 'Готово. Запуск: npm run dev'
Write-Host 'Сайт: http://localhost:3000'
