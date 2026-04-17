<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'

interface Row {
  rank: number
  team_id: number
  team_name: string
  total_percent: number
}

const rows = ref<Row[]>([])
const err = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<Row[]>('/api/scores/podium', { params: { limit: 3 } })
    rows.value = data
  } catch {
    err.value = '// fetch podium failed'
  }
})
</script>

<template>
  <div>
    <div class="mb-10 text-center">
      <p class="mb-2 font-mono text-xs text-amber-400/80">// top(limit:3)</p>
      <h1 class="text-3xl font-bold text-slate-100">Топ-3 команд</h1>
    </div>
    <p v-if="err" class="mb-6 text-center font-mono text-sm text-rose-400">{{ err }}</p>
    <div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
      <div
        v-for="(r, i) in rows"
        :key="r.team_id"
        class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-black p-6 text-center shadow-xl"
        :class="{
          'ring-2 ring-amber-400/40 md:-translate-y-2': i === 0,
          'ring-1 ring-slate-600/50': i !== 0,
        }"
      >
        <div
          class="mb-4 inline-flex rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 font-mono text-sm font-bold text-slate-950"
        >
          #{{ r.rank }}
        </div>
        <h2 class="mb-3 font-mono text-lg font-semibold text-white">
          <RouterLink :to="`/teams/${r.team_id}`" class="hover:text-cyan-300">{{ r.team_name }}</RouterLink>
        </h2>
        <p class="font-mono text-3xl font-bold tabular-nums text-emerald-400">{{ r.total_percent.toFixed(2) }}%</p>
      </div>
    </div>
  </div>
</template>
