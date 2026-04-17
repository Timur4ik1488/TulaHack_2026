<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

interface Sheet {
  team_id: number
  criterion_id: number
  criterion_name: string
  max_score: number
  value: number
  is_final: boolean
}

const teams = ref<Team[]>([])
const mine = ref<Sheet[]>([])

onMounted(async () => {
  const [t, m] = await Promise.all([api.get<Team[]>('/api/teams/'), api.get<Sheet[]>('/api/scores/mine')])
  teams.value = t.data
  mine.value = m.data
})

function progressForTeam(teamId: number) {
  const rows = mine.value.filter((r) => r.team_id === teamId)
  if (!rows.length) {
    return '∅ drafts'
  }
  const finals = rows.filter((r) => r.is_final).length
  return `${finals}/${rows.length} final`
}
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">// GET /api/scores/mine</p>
      <h1 class="text-3xl font-bold text-slate-100">Очередь команд</h1>
    </div>
    <div class="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
      <table class="table w-full">
        <thead>
          <tr class="border-b border-white/10 font-mono text-xs uppercase tracking-wider text-slate-500">
            <th class="bg-transparent">Team</th>
            <th class="bg-transparent">Progress</th>
            <th class="bg-transparent" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in teams" :key="t.id" class="border-white/5 hover:bg-white/[0.03]">
            <td>
              <div class="flex items-center gap-3">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-800 font-mono text-xs text-slate-500"
                >
                  <img v-if="t.photo_url" :src="t.photo_url" class="h-full w-full object-cover" alt="" />
                  <span v-else>&lt;/&gt;</span>
                </div>
                <span class="font-medium text-slate-200">{{ t.name }}</span>
              </div>
            </td>
            <td class="font-mono text-xs text-slate-500">{{ progressForTeam(t.id) }}</td>
            <td>
              <RouterLink
                :to="`/jury/score/${t.id}`"
                class="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300 transition hover:bg-cyan-500/20"
              >
                score --form
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
