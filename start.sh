#!/usr/bin/env bash
set -e

# Root projektu
cd "$(dirname "$0")"

echo "[1/2] Aktywuję backend/.venv i odpalam Django..."

if [ ! -d backend/.venv ]; then
  echo "BŁĄD: backend/.venv nie istnieje."
  echo "Najpierw uruchom ./setup.sh"
  exit 1
fi

source backend/.venv/bin/activate

python3 backend/manage.py runserver &
BACKEND_PID=$!
echo "  Django działa na http://127.0.0.1:8000  (PID: $BACKEND_PID)"

echo "[2/2] Odpalam frontend (npm start)..."
cd frontend

if [ ! -d node_modules ]; then
  echo "BŁĄD: brak node_modules w frontend/."
  echo "Najpierw uruchom ./setup.sh"
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

npm start &
FRONTEND_PID=$!
echo "  Frontend działa na http://localhost:3000  (PID: $FRONTEND_PID)"

echo
echo "Aby zatrzymać oba serwery wciśnij Ctrl+C."

# Po Ctrl+C sprzątamy oba procesy
trap 'echo; echo "Zatrzymuję serwery..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT

wait