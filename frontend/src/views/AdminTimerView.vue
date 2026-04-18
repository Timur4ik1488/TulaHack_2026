<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { apiErrorMessage } from '../utils/apiErrorMessage'

const auth = useAuthStore()

interface TimerResp {
  deadline_at: string | null
  server_now: string
  submission_window_open?: boolean
  deadline_passed?: boolean
  last_duration_minutes?: number | null
}

const minutes = ref(45)
const secondsLeft = ref(0)
const deadlinePassed = ref(false)
const msg = ref('')
const busy = ref(false)

let pollHandle: ReturnType<typeof setInterval> | null = null

const display = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const isRunning = computed(() => secondsLeft.value > 0)

async function poll() {
  try {
    const { data } = await api.get<TimerResp>('/api/timer/')
    deadlinePassed.value = !!data.deadline_passed
    if (data.last_duration_minutes != null && Number.isFinite(data.last_duration_minutes)) {
      minutes.value = Math.round(data.last_duration_minutes)
    }
    if (!data.deadline_at) {
      secondsLeft.value = 0
      return
    }
    const end = new Date(data.deadline_at).getTime()
    const srv = new Date(data.server_now).getTime()
    secondsLeft.value = Math.max(0, Math.floor((end - srv) / 1000))
    if (secondsLeft.value === 0 && data.deadline_at) {
      deadlinePassed.value = true
    }
  } catch {
    /* гость без сети — тихо */
  }
}

async function start() {
  if (auth.role !== 'admin') {
    msg.value = 'Только админ может запускать серверный таймер'
    return
  }
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/timer/start', { minutes: minutes.value })
    await poll()
    msg.value = 'Таймер запущен на сервере'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось запустить')
  } finally {
    busy.value = false
  }
}

async function stop() {
  if (auth.role !== 'admin') return
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/timer/stop')
    await poll()
    msg.value = 'Таймер остановлен'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось остановить')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void poll()
  pollHandle = setInterval(poll, 1000)
})

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle)
})
</script>

<template>
  <div class="mx-auto max-w-lg space-y-8 px-1 sm:px-0">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">
        {{ auth.role === 'admin' ? 'admin · таймер на сервере' : 'таймер на сервере (только просмотр)' }}
      </p>
      <h1
        class="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
      >
        Таймер хакатона
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Синхронизация с бэкендом: все клиенты видят одно и то же время (опрос раз в секунду). Поле «минуты» подтягивает
        значение последнего старта с сервера, чтобы не путать с дефолтом 45.
      </p>
    </div>

    <div
      class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 text-center shadow-2xl backdrop-blur-md hs-glow-merge sm:p-8"
    >
      <label v-if="auth.role === 'admin'" class="mx-auto block max-w-xs text-left">
        <span class="mb-2 block font-mono text-[10px] uppercase tracking-wider text-slate-500">минуты (старт)</span>
        <input
          v-model.number="minutes"
          type="number"
          min="1"
          step="1"
          class="input w-full border-white/10 bg-black/40 font-mono text-slate-100 focus:border-cyan-500/40"
          :disabled="busy || isRunning"
        />
      </label>
      <p
        class="my-6 bg-gradient-to-br from-cyan-400 via-white to-emerald-400 bg-clip-text font-mono text-5xl font-bold tabular-nums text-transparent sm:text-6xl md:text-7xl"
      >
        {{ display }}
      </p>
      <p v-if="isRunning && minutes" class="mb-2 font-mono text-[11px] text-slate-500">
        Запущено на <span class="text-cyan-400/90">{{ minutes }}</span> мин (сервер) · осталось см. выше
      </p>
      <p v-if="deadlinePassed" class="mb-4 rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 font-mono text-xs text-amber-100">
        Дедлайн наступил. На сайте отправлено событие «хакатон завершён»; ссылки на решения заморожены.
      </p>
      <p v-if="msg" class="mb-4 font-mono text-xs text-slate-400">{{ msg }}</p>
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <button
          v-if="auth.role === 'admin'"
          type="button"
          class="btn border-0 bg-gradient-to-r from-emerald-600 to-cyan-600 font-mono text-sm text-white hover:opacity-95 disabled:opacity-40"
          :disabled="busy"
          @click="start"
        >
          старт на сервере
        </button>
        <button
          v-if="auth.role === 'admin'"
          type="button"
          class="btn border border-white/15 bg-white/5 font-mono text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
          :disabled="busy"
          @click="stop"
        >
          стоп
        </button>
      </div>
      <p v-if="auth.role !== 'admin'" class="mt-4 font-mono text-[11px] text-slate-600">
        Управление таймером только у администратора.
      </p>
    </div>
  </div>
</template>
