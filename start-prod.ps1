param(
    [string]$Url = $(if ($env:METRO_URL) { $env:METRO_URL } else { 'http://3.73.73.77' })
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Get-HostFromUrl {
    param([string]$RawUrl)
    $u = $RawUrl -replace '^https?://', ''
    $u = ($u -split '[/?#]')[0]
    if ($u -match ':') {
        $u = $u.Split(':')[0]
    }
    return $u
}

function Set-EnvVar {
    param(
        [string]$Key,
        [string]$Value,
        [string]$FilePath
    )
    $lines = @()
    $found = $false
    if (Test-Path $FilePath) {
        foreach ($line in Get-Content $FilePath) {
            if ($line -match "^$([regex]::Escape($Key))=") {
                $lines += "$Key=$Value"
                $found = $true
            } else {
                $lines += $line
            }
        }
    }
    if (-not $found) {
        $lines += "$Key=$Value"
    }
    $lines | Set-Content -Path $FilePath -Encoding UTF8
}

$hostName = Get-HostFromUrl -RawUrl $Url
if ([string]::IsNullOrWhiteSpace($hostName)) {
    Write-Host "BLAD: nie udalo sie wyciagnac hosta z URL: $Url" -ForegroundColor Red
    exit 1
}

Write-Host '=== METRO - start produkcji (Docker) ==='
Write-Host "URL:  $Url"
Write-Host "Host: $hostName"
Write-Host ''

if (-not (Test-Path 'env.example')) {
    Write-Host 'BLAD: brak pliku env.example.' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path '.env')) {
    Copy-Item 'env.example' '.env'
    Write-Host '[1/4] Utworzono .env z env.example'
} else {
    Write-Host '[1/4] Uzywam istniejacego .env'
}

$secretLine = (Get-Content '.env' -ErrorAction SilentlyContinue | Where-Object { $_ -match '^SECRET_KEY=' } | Select-Object -First 1)
$currentSecret = if ($secretLine) { ($secretLine -split '=', 2)[1] } else { '' }

if ([string]::IsNullOrWhiteSpace($currentSecret) -or $currentSecret -eq 'change-me-to-a-long-random-string') {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $newSecret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    Set-EnvVar -Key 'SECRET_KEY' -Value $newSecret -FilePath '.env'
    Write-Host '      Wygenerowano nowy SECRET_KEY'
}

Set-EnvVar -Key 'DJANGO_DEBUG' -Value 'False' -FilePath '.env'
Set-EnvVar -Key 'DJANGO_ALLOWED_HOSTS' -Value "${hostName},127.0.0.1" -FilePath '.env'

Write-Host "[2/4] .env - DJANGO_ALLOWED_HOSTS=${hostName},127.0.0.1"

if (-not (Test-Path 'backend/db.sqlite3')) {
    New-Item -ItemType File -Path 'backend/db.sqlite3' -Force | Out-Null
    Write-Host '[3/4] Utworzono pusty backend/db.sqlite3'
} else {
    Write-Host '[3/4] backend/db.sqlite3 OK'
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'BLAD: Docker nie jest dostepny w PATH.' -ForegroundColor Red
    exit 1
}

Write-Host '[4/4] Buduje i uruchamiam kontenery (prod)...'
docker compose --profile prod up -d --build --force-recreate

if ($LASTEXITCODE -ne 0) {
    Write-Host 'BLAD: docker compose nie powiodl sie.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Gotowe.'
Write-Host "  Aplikacja: http://${hostName}/"
Write-Host "  Admin:     http://${hostName}/admin/"
Write-Host ''
Write-Host 'Logi:  docker compose --profile prod logs -f'
Write-Host 'Stop:  docker compose --profile prod down'
