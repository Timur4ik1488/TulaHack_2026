# TulaHack_2026
Решение для хакатона TulaHack 2026: **HackSwipe** — интерфейс в духе Tinder для **команд хакатона** (свайп-оценка жюри, лидерборд в реальном времени).

- **Бэкенд:** `backend/` — FastAPI, Socket.IO, **PostgreSQL** (`DATABASE_URL` или `POSTGRES_*`), при старте в Docker: `alembic upgrade head`.
- **Фронтенд:** `frontend/` — Vue 3, Vite, Pinia, Tailwind + DaisyUI (тёмная dev-эстетика). Запуск: `cd frontend && npm install && npm run dev` (прокси `/api` и `/socket.io` на `127.0.0.1:8000`).
- **Контракт свайпа:** [docs/SWIPE_AND_SCORING.md](docs/SWIPE_AND_SCORING.md).
