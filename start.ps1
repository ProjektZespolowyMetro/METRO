$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$backendProcess = $null

function Stop-RunningProcesses {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

try {
    Write-Host '[1/2] Sprawdzam backend/.venv i uruchamiam Django...'

    if (-not (Test-Path 'backend/.venv')) {
        Write-Host 'BLAD: backend/.venv nie istnieje.' -ForegroundColor Red
        Write-Host 'Najpierw uruchom .\setup.ps1 (albo ./setup.sh w Git Bash).'
        throw 'Brak backend/.venv'
    }

    $pythonExe = Join-Path $PSScriptRoot 'backend/.venv/Scripts/python.exe'
    if (-not (Test-Path $pythonExe)) {
        Write-Host "BLAD: Nie znaleziono $pythonExe" -ForegroundColor Red
        throw 'Brak python.exe w virtualenv'
    }

    $backendProcess = Start-Process -FilePath $pythonExe -ArgumentList 'backend/manage.py runserver' -PassThru
    Start-Sleep -Seconds 1

    if ($backendProcess.HasExited) {
        Write-Host "BLAD: backend zakonczyl sie od razu. Kod: $($backendProcess.ExitCode)" -ForegroundColor Red
        throw 'Backend nie wystartowal'
    }

    Write-Host "  Django dziala na http://127.0.0.1:8000 (PID: $($backendProcess.Id))"

    Write-Host '[2/2] Uruchamiam frontend (npm start)...'
    if (-not (Test-Path 'frontend/node_modules')) {
        Write-Host 'BLAD: brak node_modules w frontend/.' -ForegroundColor Red
        Write-Host 'Najpierw uruchom .\setup.ps1 (albo ./setup.sh w Git Bash).'
        throw 'Brak frontend/node_modules'
    }

    Write-Host '  Frontend uruchamia sie w tym oknie (pelne logi ponizej).'
    Write-Host ''
    Write-Host 'Aby zatrzymac oba serwery, nacisnij Ctrl+C.'

    Push-Location (Join-Path $PSScriptRoot 'frontend')
    try {
        npm start
        $frontendExit = $LASTEXITCODE
        if ($frontendExit -ne 0) {
            Write-Host "`nBLAD: frontend zakonczyl sie kodem: $frontendExit" -ForegroundColor Red
        }
    }
    finally {
        Pop-Location
    }

    if ($backendProcess.HasExited) {
        Write-Host "`nBLAD: backend zakonczyl sie. Kod: $($backendProcess.ExitCode)" -ForegroundColor Red
    }
}
catch {
    Write-Host "`nSzczegoly bledu: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Stop-RunningProcesses
    Read-Host "`nSkrypt zakonczony. Nacisnij Enter, aby zamknac"
}
