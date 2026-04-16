#!/usr/bin/env bash
set -u -o pipefail

# Root projektu
cd "$(dirname "$0")"

BACKEND_PID=""
FRONTEND_PID=""

pause_before_exit() {
  # Ulatwia debugowanie przy uruchamianiu skryptu przez podwojne klikniecie.
  if [ -t 0 ]; then
    echo
    read -r -p "Skrypt zakonczony. Nacisnij Enter, aby zamknac..." _
  fi
}

cleanup() {
  if [ -n "$BACKEND_PID" ] || [ -n "$FRONTEND_PID" ]; then
    echo
    echo "Zatrzymuję serwery..."
    kill ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'echo; echo "Przerwano przez Ctrl+C."; exit 130' INT

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

# Czekaj, az ktorys proces padnie i wypisz jasny komunikat.
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXIT_CODE=$?

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo
  echo "BŁĄD: backend (Django) zakończył się kodem $EXIT_CODE."
fi

if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  echo
  echo "BŁĄD: frontend (npm start) zakończył się kodem $EXIT_CODE."
fi

pause_before_exit
exit "$EXIT_CODE"