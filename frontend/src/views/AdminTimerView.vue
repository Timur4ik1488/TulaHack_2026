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

/** Длительность следующего старта: часы и минуты (не затираются опросом). */
const durationHours = ref(0)
const durationMins = ref(45)
/** Однократно подставить чч:мм из last_duration_minutes после первого ответа сервера. */
const durationHydratedFromServer = ref(false)
/** Сколько минут было задано при последнем старте (для подписи «запущено на …»). */
const lastStartedTotalMinutes = ref<number | null>(null)

const secondsLeft = ref(0)
const deadlinePassed = ref(false)
const msg = ref('')
const busy = ref(false)

let pollHandle: ReturnType<typeof setInterval> | null = null

function applyTotalMinutesToDurationInputs(total: number) {
  const t = Math.max(0, Math.round(total))
  durationHours.value = Math.floor(t / 60)
  durationMins.value = t % 60
}

function normalizeDurationParts(): { h: number; m: number; total: number } {
  let h = Math.max(0, Math.floor(Number(durationHours.value) || 0))
  let m = Math.floor(Number(durationMins.value) || 0)
  h += Math.floor(m / 60)
  m = m % 60
  if (m < 0) m = 0
  return { h, m, total: h * 60 + m }
}

const durationLabel = computed(() => {
  const { h, m } = normalizeDurationParts()
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${hh}-${mm}`
})

const totalStartMinutes = computed(() => normalizeDurationParts().total)

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
      lastStartedTotalMinutes.value = Math.round(data.last_duration_minutes)
    }
    if (!durationHydratedFromServer.value) {
      durationHydratedFromServer.value = true
      if (data.last_duration_minutes != null && Number.isFinite(data.last_duration_minutes)) {
        applyTotalMinutesToDurationInputs(data.last_duration_minutes)
      }
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
    msg.value = 'Только админ может крутить общий таймер'
    return
  }
  const { h, m, total } = normalizeDurationParts()
  durationHours.value = h
  durationMins.value = m
  if (total <= 0) {
    msg.value = 'Задайте длительность больше нуля (часы и минуты)'
    return
  }
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/timer/start', { minutes: total })
    await poll()
    msg.value = 'Погнали — отсчёт для всех запущен'
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
        {{ auth.role === 'admin' ? 'admin · общий отсчёт' : 'отсчёт для всех (только просмотр)' }}
      </p>
      <h1
        class="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
      >
        Таймер хакатона
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Один таймер на весь зал: цифры бегут у всех одинаково. Длительность следующего забега — часы и минуты в формате
        чч-мм; при открытии страницы подставим прошлый забег один раз, дальше поля только твои.
      </p>
    </div>

    <div
      class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 text-center shadow-2xl backdrop-blur-md hs-glow-merge sm:p-8"
    >
      <div v-if="auth.role === 'admin'" class="mx-auto max-w-md text-left">
        <span class="mb-2 block font-mono text-[10px] uppercase tracking-wider text-slate-500">длительность старта (чч-мм)</span>
        <div class="flex flex-wrap items-end gap-2">
          <label class="min-w-[5.5rem] flex-1">
            <span class="mb-1 block text-[10px] text-slate-600">часы</span>
            <input
              v-model.number="durationHours"
              type="number"
              min="0"
              max="999"
              step="1"
              class="input w-full border-white/10 bg-black/40 font-mono text-slate-100 focus:border-cyan-500/40"
              :disabled="busy || isRunning"
            />
          </label>
          <span class="pb-2 font-mono text-slate-500">:</span>
          <label class="min-w-[5.5rem] flex-1">
            <span class="mb-1 block text-[10px] text-slate-600">минуты</span>
            <input
              v-model.number="durationMins"
              type="number"
              min="0"
              max="59"
              step="1"
              class="input w-full border-white/10 bg-black/40 font-mono text-slate-100 focus:border-cyan-500/40"
              :disabled="busy || isRunning"
            />
          </label>
        </div>
        <p class="mt-2 font-mono text-[11px] text-slate-500">
          формат <span class="text-cyan-400/90">{{ durationLabel }}</span>
          · всего <span class="text-slate-300">{{ totalStartMinutes }}</span> мин
        </p>
      </div>
      <p
        class="my-6 bg-gradient-to-br from-cyan-400 via-white to-emerald-400 bg-clip-text font-mono text-5xl font-bold tabular-nums text-transparent sm:text-6xl md:text-7xl"
      >
        {{ display }}
      </p>
      <p v-if="isRunning && lastStartedTotalMinutes != null" class="mb-2 font-mono text-[11px] text-slate-500">
        Забег на
        <span class="text-cyan-400/90">{{ lastStartedTotalMinutes }}</span>
        мин · остаток на табло выше
      </p>
      <p v-if="deadlinePassed" class="mb-4 rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 font-mono text-xs text-amber-100">
        Финишная черта. Хакатон в статусе «стоп-кран»: ссылки на решения больше не двигаются.
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
          старт для всех
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
        Крутить таймер может только админ — ты тут в режиме зрителя.
      </p>
    </div>
  </div>
</template>
