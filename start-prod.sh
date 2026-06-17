#!/usr/bin/env bash
# Uruchomienie produkcyjnego stacku Docker (nginx + backend).
# Użycie:
#   ./start-prod.sh
#   ./start-prod.sh http://3.73.73.77
#   METRO_URL=http://twoja-domena.pl ./start-prod.sh

set -euo pipefail
cd "$(dirname "$0")"

METRO_URL="${1:-${METRO_URL:-http://3.73.73.77}}"

parse_host() {
  local url="$1"
  url="${url#http://}"
  url="${url#https://}"
  url="${url%%/*}"
  url="${url%%\?*}"
  url="${url%%#*}"
  if [[ "$url" == *:* ]]; then
    url="${url%%:*}"
  fi
  echo "$url"
}

set_env_var() {
  local key="$1" value="$2" file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

HOST="$(parse_host "$METRO_URL")"
if [[ -z "$HOST" ]]; then
  echo "BŁĄD: nie udało się wyciągnąć hosta z URL: $METRO_URL" >&2
  exit 1
fi

echo "=== METRO — start produkcji (Docker) ==="
echo "URL:    $METRO_URL"
echo "Host:   $HOST"
echo ""

if [[ ! -f env.example ]]; then
  echo "BŁĄD: brak pliku env.example w katalogu projektu." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp env.example .env
  echo "[1/4] Utworzono .env z env.example"
else
  echo "[1/4] Używam istniejącego .env"
fi

CURRENT_SECRET="$(grep '^SECRET_KEY=' .env 2>/dev/null | cut -d= -f2- || true)"
if [[ -z "$CURRENT_SECRET" || "$CURRENT_SECRET" == "change-me-to-a-long-random-string" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    NEW_SECRET="$(openssl rand -hex 32)"
  else
    NEW_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  set_env_var "SECRET_KEY" "$NEW_SECRET" ".env"
  echo "      Wygenerowano nowy SECRET_KEY"
fi

set_env_var "DJANGO_DEBUG" "False" ".env"
set_env_var "DJANGO_ALLOWED_HOSTS" "${HOST},127.0.0.1" ".env"

echo "[2/4] .env — DJANGO_ALLOWED_HOSTS=${HOST},127.0.0.1"

if [[ ! -f backend/db.sqlite3 ]]; then
  touch backend/db.sqlite3
  echo "[3/4] Utworzono pusty backend/db.sqlite3"
else
  echo "[3/4] backend/db.sqlite3 OK"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "BŁĄD: Docker nie jest zainstalowany lub niedostępny w PATH." >&2
  exit 1
fi

echo "[4/4] Buduję i uruchamiam kontenery (prod)..."
docker compose --profile prod up -d --build --force-recreate

echo ""
echo "Gotowe."
echo "  Aplikacja: http://${HOST}/"
echo "  Admin:     http://${HOST}/admin/"
echo ""
echo "Logi:  docker compose --profile prod logs -f"
echo "Stop:  docker compose --profile prod down"
