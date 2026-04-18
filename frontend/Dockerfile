# ---- build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# --- DEPLOY (прод, опционально): ---
# ARG GIT_SHA=unknown
# LABEL org.opencontainers.image.revision=$GIT_SHA
# Публичный хост 150.241.103.30 — в nginx server_name и PUBLIC_SITE_URL в .env бэкенда, не в Dockerfile.
