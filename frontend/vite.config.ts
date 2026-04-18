import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// =============================================================================
// DEPLOY (прод): только подсказки. Локально не меняйте proxy — оставьте 127.0.0.1:8000.
// Сервер приложений: 150.241.103.30 (БД на 150.241.103.30:5435 — только для backend .env, не для Vite).
// Если когда-нибудь гоняете preview с прокси на удалённый API (редко нужно):
//   proxy: { '/api': { target: 'http://150.241.103.30', changeOrigin: true }, ... }
// Прод-сборка: VITE_API_URL в .env.production (см. frontend/.env.example).
// =============================================================================

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue(), tailwindcss()],
  server: {
    // Туннели ngrok / произвольные хосты в dev (поддомен каждый раз новый).
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
