<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useSocket } from '../composables/useSocket'

interface Row {
  rank: number
  team_id: number
  team_name: string
  jury_percent: number
  sympathy_bonus_percent: number
  total_percent: number
}

const rows = ref<Row[]>([])
const err = ref('')
const { ensureConnected } = useSocket()

function podiumCardClass(rank: number) {
  if (rank === 1) {
    return 'border-amber-400/55 bg-gradient-to-b from-amber-950/70 via-slate-900/90 to-black shadow-amber-900/30 ring-2 ring-amber-400/40'
  }
  if (rank === 2) {
    return 'border-slate-300/45 bg-gradient-to-b from-slate-700/60 via-slate-900/90 to-black shadow-slate-900/30 ring-2 ring-slate-300/35'
  }
  if (rank === 3) {
    return 'border-orange-700/50 bg-gradient-to-b from-orange-950/65 via-amber-950/40 to-black shadow-orange-950/25 ring-2 ring-orange-600/35'
  }
  return 'border-white/10 bg-gradient-to-b from-slate-900/90 to-black'
}

function podiumBadgeClass(rank: number) {
  if (rank === 1) return 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-900/40'
  if (rank === 2) return 'bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 text-slate-950 shadow-lg shadow-slate-900/40'
  if (rank === 3) return 'bg-gradient-to-r from-orange-300 via-amber-600 to-amber-900 text-slate-950 shadow-lg shadow-orange-950/40'
  return 'from-slate-600 to-slate-800 text-white'
}

async function load() {
  try {
    const { data } = await api.get<Row[]>('/api/scores/podium', { params: { limit: 3 } })
    rows.value = data
  } catch {
    err.value = 'Не удалось загрузить подиум'
  }
}

onMounted(async () => {
  await load()
  const s = ensureConnected()
  s.on('rating_updated', load)
})

onUnmounted(() => {
  const s = ensureConnected()
  s.off('rating_updated', load)
})
</script>

<template>
  <div class="px-1 sm:px-0">
    <div class="mb-10 text-center">
      <p class="mb-2 font-mono text-xs text-amber-400/80">// топ-3</p>
      <h1 class="text-3xl font-bold text-slate-100 sm:text-4xl">Топ-3 команд</h1>
      <p class="mx-auto mt-3 max-w-md text-sm text-slate-500">
        Топ-3 по итогу лидерборда: жюри плюс бонус зрительских симпатий. Клик по названию — публичная карточка.
      </p>
    </div>
    <p v-if="err" class="mb-6 text-center font-mono text-sm text-rose-400">{{ err }}</p>
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      <div
        v-for="r in rows"
        :key="r.team_id"
        class="relative overflow-hidden rounded-3xl p-6 text-center shadow-xl"
        :class="[
          podiumCardClass(r.rank),
          r.rank === 1 ? 'lg:-translate-y-2' : '',
        ]"
      >
        <div
          class="mb-4 inline-flex rounded-full px-4 py-1.5 font-mono text-sm font-bold"
          :class="podiumBadgeClass(r.rank)"
        >
          #{{ r.rank }}
        </div>
        <h2 class="mb-3 font-mono text-base font-semibold text-white sm:text-lg">
          <RouterLink :to="`/teams/${r.team_id}`" class="hover:text-cyan-300">{{ r.team_name }}</RouterLink>
        </h2>
        <p class="font-mono text-2xl font-bold tabular-nums text-emerald-400 sm:text-3xl">{{ r.total_percent.toFixed(2) }}%</p>
        <p class="mt-2 font-mono text-[10px] leading-relaxed text-slate-500">
          жюри {{ (r.jury_percent ?? 0).toFixed(2) }}% · симп. +{{ (r.sympathy_bonus_percent ?? 0).toFixed(2) }}%
        </p>
      </div>
    </div>
  </div>
</template>
