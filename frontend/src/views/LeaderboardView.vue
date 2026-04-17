<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useSocket } from '../composables/useSocket'

interface Row {
  rank: number
  team_id: number
  team_name: string
  total_percent: number
}

const rows = ref<Row[]>([])
const err = ref('')
const { ensureConnected } = useSocket()

async function load() {
  try {
    const { data } = await api.get<Row[]>('/api/scores/leaderboard')
    rows.value = data
  } catch {
    err.value = "fetch('/api/scores/leaderboard') failed"
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
      <p class="mb-2 font-mono text-xs text-emerald-500/80">// live: rating_updated</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">Лидерборд команд</h1>
      <p class="mt-2 text-sm text-slate-500">Обновляется по WebSocket — как CI на зелёном пайплайне.</p>
    </div>
    <p v-if="err" class="mb-4 text-center font-mono text-sm text-rose-400">{{ err }}</p>
    <TransitionGroup name="lb" tag="ul" class="relative mx-auto max-w-2xl space-y-3">
      <li
        v-for="r in rows"
        :key="r.team_id"
        class="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/50 px-5 py-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-cyan-500/25 hover:shadow-cyan-900/20"
      >
        <div class="flex min-w-0 items-center gap-4">
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 font-mono text-lg font-bold text-cyan-400 ring-1 ring-white/10"
          >
            #{{ r.rank }}
          </span>
          <RouterLink
            :to="`/teams/${r.team_id}`"
            class="truncate font-semibold text-slate-200 underline decoration-cyan-500/0 decoration-2 underline-offset-4 transition group-hover:decoration-cyan-400/80"
          >
            {{ r.team_name }}
          </RouterLink>
        </div>
        <span
          class="shrink-0 rounded-lg bg-black/40 px-3 py-1.5 font-mono text-lg tabular-nums text-emerald-400 ring-1 ring-emerald-500/20"
        >
          {{ r.total_percent.toFixed(2) }}%
        </span>
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
