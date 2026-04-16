# METRO - Keypointy Zmian

## 1) System grywalizacji: logowanie + ranking
- Dodano rejestracje i logowanie uzytkownika (token auth).
- Dodano zapis wyniku gracza (profit dzienny) do bazy.
- Dodano publiczny ranking TOP wynikow.

Backend:
- Nowy model: `backend/api/models.py` -> `GameScore`.
- Rejestracja modelu w adminie: `backend/api/admin.py`.
- Endpointy API:
  - `POST /api/auth/register/`
  - `POST /api/auth/login/`
  - `POST /api/scores/` (wymaga tokenu)
  - `GET /api/scores/ranking/?limit=10`
- Routing: `backend/api/urls.py`.
- Logika endpointow: `backend/api/views.py`.
- Konfiguracja DRF token auth: `backend/metro/settings.py`.
- Migracja modelu: `backend/api/migrations/0001_initial.py`.

Frontend:
- API client auth/rankingu: `frontend/src/services/AuthAndRankingApi.tsx`.
- Helper liczenia dziennego profitu: `frontend/src/services/SendPinsToApi.tsx`.
- Panel logowania/rejestracji: `frontend/src/components/AuthPanel.tsx`.
- Tabela rankingu TOP 10: `frontend/src/components/RankingTable.tsx`.
- Integracja UI i flow zapisu wyniku:
  - `frontend/src/components/PinMenu.tsx`
  - `frontend/src/screens/MainMap.tsx`

## 2) Uruchamianie na Windows i diagnostyka bledow
- Poprawiono `start.sh`, aby:
  - nie wychodzil od razu przy bledzie,
  - pokazywal czytelny komunikat,
  - czekal na Enter przed zamknieciem.
- Dodano `start.ps1` (Windows), aby uruchamiac backend + frontend i widziec bledy w tym samym oknie.
- Dodano `setup.ps1` (Windows), aby przygotowac srodowisko (`.venv`, pip deps, npm deps).

## 3) Poprawka bledow `Failed to fetch` dla kafli mapy
Przyczyna:
- Frontend uruchomil sie na `localhost:3001` (bo 3000 bylo zajete),
- backend CORS dopuszczal tylko `3000`.

Naprawa:
- Zaktualizowano `backend/metro/settings.py`:
  - dodano originy dla `3001`,
  - dodano regexy CORS dla `localhost` i `127.0.0.1` na dowolnym porcie dev.

## 4) Stan po zmianach
- `python manage.py check` przechodzi poprawnie.
- Migracje bazy zostaly wykonane.
- Frontend sie buduje, pozostaja stare warningi ESLint niezalezne od tych zmian.

## 5) Szybkie uruchomienie
1. Setup (pierwszy raz):
   - `./setup.ps1`
2. Start aplikacji:
   - `./start.ps1`
3. Gdy port 3000 zajety:
   - wybierz inny port (Y) lub zwolnij 3000.
