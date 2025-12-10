#!/usr/bin/env bash
set -e 

# Idziemy do katalogu z tym skryptem (root projektu)
cd "$(dirname "$0")"

echo "[1/3] Sprawdzam backend/.env..."
if [ ! -f backend/.env ]; then
  echo "  Nie ma backend/.env – tworzę..."
  cat > backend/.env <<EOF
SECRET_KEY=key
EOF
else
  echo "  backend/.env już istnieje – nic nie robię."
fi

echo "[2/3] Sprawdzam virtualenv dla Django..."
if [ ! -d backend/.venv ]; then
  echo "  Tworzę backend/.venv..."
  python3 -m venv backend/.venv
else
  echo "  backend/.venv już istnieje – nic nie robię."
fi

echo "[2.5/3] Instaluję zależności Pythona w backend/.venv..."
source backend/.venv/bin/activate
pip install --upgrade pip >/dev/null

if [ -f backend/requirements.txt ]; then
  echo "  Instaluję z backend/requirements.txt..."
  pip install -r backend/requirements.txt
else
  echo "  Brak backend/requirements.txt – instaluję minimalny zestaw..."
  pip install django djangorestframework python-dotenv django-cors-headers
fi

echo "[3/3] Instaluję zależności frontendu (npm install)..."
cd frontend

if [ ! -d node_modules ]; then
  echo "  Brak node_modules – robię npm install..."
  npm install
else
  echo "  node_modules już istnieje – nic nie robię."
fi

echo
echo "Setup środowiska zakończony"