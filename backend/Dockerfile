FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYCODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# CMD [ "uvicorn", "app.main:app", "--host",  "0.0.0.0", "--port", "8000" ]

# --- DEPLOY (прод, опционально): не включать без отдельной проверки ---
# Непривилегированный пользователь в образе:
# RUN useradd -m -u 10001 appuser && chown -R appuser:appuser /app
# USER appuser
# Многостадийность / distroless — по желанию CI.
# Подключение к БД на 150.241.103.30:5435 задаётся только через .env / compose, не здесь.