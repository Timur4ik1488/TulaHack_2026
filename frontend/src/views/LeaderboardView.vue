<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useSocket } from '../composables/useSocket'

interface Row {
  rank: number
  team_id: number
  team_name: string
  case_ordinal?: number | null
  case_id?: number | null
  case_title?: string | null
  jury_percent: number
  sympathy_bonus_percent: number
  sympathy_votes_sum?: number
  total_percent: number
}

const rows = ref<Row[]>([])
const err = ref('')
const { ensureConnected } = useSocket()

function medalRowClass(rank: number) {
  if (rank === 1) {
    return 'border-amber-400/50 bg-gradient-to-r from-amber-950/55 via-slate-900/70 to-amber-900/40 shadow-amber-900/20 ring-1 ring-amber-400/35'
  }
  if (rank === 2) {
    return 'border-slate-300/40 bg-gradient-to-r from-slate-700/50 via-slate-900/65 to-slate-600/40 shadow-slate-900/25 ring-1 ring-slate-300/30'
  }
  if (rank === 3) {
    return 'border-orange-700/45 bg-gradient-to-r from-orange-950/50 via-amber-950/35 to-slate-900/60 shadow-orange-950/20 ring-1 ring-orange-600/30'
  }
  return 'border-white/10 bg-slate-900/50 shadow-black/20'
}

function rankBadgeClass(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 ring-amber-200/40'
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950 ring-slate-200/40'
  if (rank === 3) return 'bg-gradient-to-br from-orange-300 to-amber-800 text-slate-950 ring-orange-300/35'
  return 'bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400 ring-white/10'
}

function sympathyVotesHint(n?: number) {
  const v = n ?? 0
  if (v === 0) return ''
  return ` (Σ ${v})`
}

function formatSympathyBonus(p: number) {
  const sign = p > 0 ? '+' : p < 0 ? '−' : ''
  return `${sign}${Math.abs(p).toFixed(2)}%`
}

async function load() {
  try {
    const { data } = await api.get<Row[]>('/api/scores/leaderboard')
    rows.value = data
  } catch {
    err.value = 'Не удалось загрузить лидерборд'
  }
}

onMounted(async () => {
  await load()
  const s = ensureConnected()
  s.on('rating_updated', () => {
    load()
  })
})

onUnmounted(() => {
  const s = ensureConnected()
  s.off('rating_updated')
})
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <p class="mb-2 font-mono text-xs text-emerald-500/80">// обновление рейтинга в реальном времени</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">Лидерборд команд</h1>
      <p class="mt-2 text-sm text-slate-500">
        Итог: жюри + симпатии (1 единица суммы голосов = 0,5 п.п.). Обновление по WebSocket.
      </p>
    </div>
    <p v-if="err" class="mb-4 text-center font-mono text-sm text-rose-400">{{ err }}</p>
    <TransitionGroup name="lb" tag="ul" class="relative mx-auto max-w-3xl space-y-3 px-0 sm:px-0">
      <li
        v-for="r in rows"
        :key="r.team_id"
        class="group flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/25 hover:shadow-cyan-900/20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
        :class="medalRowClass(r.rank)"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ring-2 sm:h-11 sm:w-11 sm:text-lg"
            :class="rankBadgeClass(r.rank)"
          >
            #{{ r.rank }}
          </span>
          <div class="min-w-0 flex-1 truncate">
            <RouterLink
              :to="`/teams/${r.team_id}`"
              class="block truncate font-semibold text-slate-100 underline decoration-cyan-500/0 decoration-2 underline-offset-4 transition group-hover:decoration-cyan-400/80"
            >
              {{ r.team_name }}
            </RouterLink>
            <RouterLink
              v-if="r.case_title && r.case_id != null && r.case_id !== undefined"
              :to="`/cases/${r.case_id}`"
              class="mt-0.5 block truncate font-mono text-[10px] font-normal text-amber-400/90 underline decoration-amber-500/0 underline-offset-2 hover:text-amber-300 hover:decoration-amber-400/60"
            >
              {{ r.case_title }}
            </RouterLink>
            <span
              v-else-if="r.case_ordinal != null && r.case_ordinal !== undefined"
              class="mt-0.5 block font-mono text-[10px] font-normal text-amber-400/90"
            >
              кейс №{{ r.case_ordinal }}
            </span>
          </div>
          <div class="hidden font-mono text-[10px] text-slate-500 sm:block sm:max-w-[14rem] sm:truncate">
            жюри {{ r.jury_percent?.toFixed?.(2) ?? '—' }}% · симп. {{ formatSympathyBonus(r.sympathy_bonus_percent ?? 0)
            }}{{ sympathyVotesHint(r.sympathy_votes_sum) }}
          </div>
        </div>
        <div class="flex w-full flex-col items-end gap-1 sm:w-auto">
          <span
            class="shrink-0 rounded-lg bg-black/40 px-3 py-1.5 font-mono text-base tabular-nums text-emerald-400 ring-1 ring-emerald-500/25 sm:text-lg"
          >
            {{ r.total_percent.toFixed(2) }}%
          </span>
          <span class="font-mono text-[10px] text-slate-500 sm:hidden">
            жюри {{ r.jury_percent?.toFixed?.(2) ?? '—' }}% · симп. {{ formatSympathyBonus(r.sympathy_bonus_percent ?? 0)
            }}{{ sympathyVotesHint(r.sympathy_votes_sum) }}
          </span>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.lb-move,
.lb-enter-active,
.lb-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.lb-enter-from,
.lb-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
