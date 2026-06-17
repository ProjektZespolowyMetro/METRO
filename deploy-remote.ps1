param(
    [string]$HostIp = '3.73.73.77',
    [string]$User = 'ubuntu',
    [string]$KeyPath = "$env:USERPROFILE\Downloads\latest.pem",
    [string]$Branch = 'feat/prod-deploy-script',
    [string]$RemoteDir = 'METRO'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $KeyPath)) {
    Write-Host "BLAD: brak klucza SSH: $KeyPath" -ForegroundColor Red
    exit 1
}

$remote = "${User}@${HostIp}"
$url = "http://${HostIp}"

Write-Host "=== Deploy METRO -> $url ==="
Write-Host "SSH: $remote"
Write-Host "Branch: $Branch"
Write-Host ''

$cmd = @"
set -e
cd ~/$RemoteDir || cd /home/$User/$RemoteDir || { echo 'Brak katalogu $RemoteDir'; exit 1; }
git fetch origin
git checkout $Branch
git pull origin $Branch
chmod +x start-prod.sh
./start-prod.sh $url
docker compose --profile prod ps
"@ -replace "`r", ""

ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $remote $cmd

if ($LASTEXITCODE -ne 0) {
    Write-Host 'BLAD: deploy przez SSH nie powiodl sie.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host "Gotowe: $url"
Write-Host 'Twarde odswiezenie w przegladarce: Ctrl+Shift+R'
