# METRO

Aplikacja webowa — planowanie linii metra w Krakowie (React + Django).

## Uruchomienie lokalne (bez Dockera)

### Wymagania
- Python 3.12+, Node.js 20+
- Plik `backend/.env` z `SECRET_KEY=key` (tworzy `setup.ps1`)

```powershell
.\setup.ps1
.\start.ps1
```

- Frontend: http://localhost:3000  
- Backend: http://127.0.0.1:8000

## Uruchomienie na serwerze (produkcja, Docker)

**Najszybciej — jeden skrypt** (ustawia `.env`, przebudowuje i startuje Docker):

```bash
chmod +x start-prod.sh
./start-prod.sh http://3.73.73.77
```

Windows (PowerShell):
```powershell
.\start-prod.ps1 -Url "http://3.73.73.77"
```

Domyślny URL to `http://3.73.73.77`. Można też ustawić zmienną `METRO_URL` zamiast argumentu.

Ręcznie:
```bash
git clone https://github.com/ProjektZespolowyMetro/METRO.git
cd METRO

cp env.example .env
# Edytuj .env: SECRET_KEY, DJANGO_ALLOWED_HOSTS, opcjonalnie CSRF dla HTTPS

touch backend/db.sqlite3   # jeśli plik nie istnieje

docker compose --profile prod up -d --build
```

Aplikacja: **http://IP_SERWERA** (port 80) — nginx serwuje frontend i proxyuje `/api/`, `/admin/`, `/tiles/`.

**Przykład (AWS):** [http://3.73.73.77/](http://3.73.73.77/) — w `.env` musi być:
```
DJANGO_ALLOWED_HOSTS=3.73.73.77,127.0.0.1
DJANGO_DEBUG=False
```
Bez tego frontend się ładuje, ale API i mapa zwracają błąd `DisallowedHost`.

Zatrzymanie:
```bash
docker compose --profile prod down
```

### HTTPS
Postaw reverse proxy (Caddy / certbot + nginx) przed kontenerem na porcie 80  
i ustaw w `.env`:
```
DJANGO_CSRF_TRUSTED_ORIGINS=https://twoja-domena.pl
```

## Docker — development

```bash
docker compose --profile dev up --build
```

Frontend dev server: http://localhost:3000 (lub :3001 jeśli 3000 zajęte).

## Ręczne uruchomienie (legacy)

### .env w folderze backend:
```
SECRET_KEY=key
```

### API:
```
python backend\manage.py runserver
```

### Frontend:
```
cd frontend
npm start
```

### Prettier przed commitem:
```
npx prettier --write "src/**/*.{js,ts,jsx,tsx}"
```
Ustawienia w `.prettierrc`.
