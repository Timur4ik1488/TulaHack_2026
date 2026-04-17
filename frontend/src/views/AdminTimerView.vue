<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

const minutes = ref(45)
const secondsLeft = ref(0)
const running = ref(false)
let handle: ReturnType<typeof setInterval> | null = null

const display = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

function start() {
  stop()
  secondsLeft.value = Math.max(0, Math.round(minutes.value * 60))
  running.value = true
  handle = setInterval(() => {
    if (secondsLeft.value <= 0) {
      stop()
      return
    }
    secondsLeft.value -= 1
  }, 1000)
}

function stop() {
  if (handle) {
    clearInterval(handle)
    handle = null
  }
  running.value = false
}

onUnmounted(stop)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Таймер хакатона</h1>
    <p class="mb-4 text-sm opacity-70">Локальный обратный отсчёт (без бэкенда).</p>
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center">
        <label class="form-control w-full max-w-xs">
          <span class="label-text">Минуты</span>
          <input v-model.number="minutes" type="number" min="1" class="input input-bordered" :disabled="running" />
        </label>
        <p class="py-6 font-mono text-6xl font-bold tabular-nums">{{ display }}</p>
        <div class="card-actions">
          <button type="button" class="btn btn-primary" :disabled="running" @click="start">Старт</button>
          <button type="button" class="btn btn-ghost" @click="stop">Стоп</button>
        </div>
      </div>
    </div>
  </div>
</template>
