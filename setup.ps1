$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '[1/3] Sprawdzam backend/.env...'
if (-not (Test-Path 'backend/.env')) {
    "SECRET_KEY=key" | Set-Content -Path 'backend/.env' -Encoding ASCII
    Write-Host '  Utworzono backend/.env'
} else {
    Write-Host '  backend/.env juz istnieje'
}

Write-Host '[2/3] Tworze backend/.venv i instaluje zaleznosci...'
if (-not (Test-Path 'backend/.venv')) {
    py -3 -m venv backend/.venv
    Write-Host '  Utworzono backend/.venv'
} else {
    Write-Host '  backend/.venv juz istnieje'
}

$pythonExe = Join-Path $PSScriptRoot 'backend/.venv/Scripts/python.exe'
& $pythonExe -m pip install --upgrade pip | Out-Null

if (Test-Path 'requirements.txt') {
    & $pythonExe -m pip install -r 'requirements.txt'
} else {
    & $pythonExe -m pip install django djangorestframework python-dotenv django-cors-headers
}

Write-Host '[3/3] Instaluje zaleznosci frontendu...'
if (-not (Test-Path 'frontend/node_modules')) {
    Set-Location 'frontend'
    npm install
    Set-Location $PSScriptRoot
} else {
    Write-Host '  frontend/node_modules juz istnieje'
}

Write-Host "`nSetup zakonczony."
Read-Host 'Nacisnij Enter, aby zamknac'
