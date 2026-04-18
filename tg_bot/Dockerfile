FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# В Docker задайте API_BASE_URL (например http://backend:8000) — иначе 127.0.0.1 указывает на сам контейнер.

CMD ["python", "-u", "main.py"]
