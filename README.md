# TulaHack_2026
Решение для хакатона TulaHack 2026: **HackSwipe** — интерфейс в духе Tinder для **команд хакатона** (свайп-оценка жюри, лидерборд в реальном времени).

- **Бэкенд:** `backend/` — FastAPI, Socket.IO, **PostgreSQL** в Docker/проде (`DATABASE_URL`, Alembic `upgrade head`). Для **локального запуска без Postgres** в `.env` можно `USE_SQLITE=true` (файл `hackrank.db`, `create_all` при старте) — только разработка.
- **Фронтенд:** `frontend/` — Vue 3, Vite, Pinia, Tailwind + DaisyUI (тёмная dev-эстетика). Запуск: `cd frontend && npm install && npm run dev` (прокси `/api` и `/socket.io` на `127.0.0.1:8000`).
- **Контракт свайпа:** [docs/SWIPE_AND_SCORING.md](docs/SWIPE_AND_SCORING.md).
