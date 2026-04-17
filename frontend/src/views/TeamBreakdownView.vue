<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../api/http'

interface CriterionRow {
  criterion_id: number
  criterion_name: string
  weight_percent: number
  max_score: number
  avg_expert_score: number
  criterion_fill_percent: number
  weighted_contribution_percent: number
}

interface Breakdown {
  team_id: number
  team_name: string
  total_percent: number
  criteria: CriterionRow[]
}

const data = ref<Breakdown | null>(null)
const err = ref('')
const teamId = ref<number | null>(null)

const teamIdNum = computed(() => teamId.value ?? NaN)

async function resolveTeamId() {
  err.value = ''
  teamId.value = null
  data.value = null
  try {
    const { data: s } = await api.get<{ team: { id: number } }>('/api/teams/my/summary')
    teamId.value = s.team.id
  } catch {
    err.value = 'Сначала вступите в команду.'
  }
}

async function load() {
  data.value = null
  if (!Number.isFinite(teamIdNum.value)) {
    return
  }
  try {
    const res = await api.get<Breakdown>(`/api/scores/team/${teamIdNum.value}/breakdown`)
    data.value = res.data
  } catch {
    err.value = 'Ошибка загрузки'
  }
}

onMounted(async () => {
  await resolveTeamId()
  await load()
})

watch(teamIdNum, load)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Разбор оценок</h1>
    <p v-if="err" class="text-error">{{ err }}</p>
    <template v-else-if="data">
      <h2 class="mb-2 text-xl">{{ data.team_name }} — {{ data.total_percent }}%</h2>
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>Критерий</th>
            <th>Средний балл</th>
            <th>Вклад %</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in data.criteria" :key="c.criterion_id">
            <td>{{ c.criterion_name }}</td>
            <td>{{ c.avg_expert_score }} / {{ c.max_score }}</td>
            <td>{{ c.weighted_contribution_percent }}</td>
          </tr>
        </tbody>
      </table>
    </template>
    <p v-else class="loading loading-spinner" />
  </div>
</template>
