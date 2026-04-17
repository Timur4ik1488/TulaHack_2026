<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'

interface Criterion {
  id: number
  name: string
  weight: number
  max_score: number
}

const route = useRoute()
const teamId = computed(() => Number(route.params.id))
const criteria = ref<Criterion[]>([])
const values = reactive<Record<number, number>>({})
const busy = ref(false)
const msg = ref('')

async function loadCriteria() {
  const { data } = await api.get<Criterion[]>('/api/criteria/')
  criteria.value = data
  for (const c of data) {
    if (values[c.id] === undefined) {
      values[c.id] = 0
    }
  }
}

async function saveCriterion(criterionId: number) {
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/scores/', {
      team_id: teamId.value,
      criterion_id: criterionId,
      value: values[criterionId],
    })
    msg.value = 'Сохранено'
  } catch {
    msg.value = 'Ошибка'
  } finally {
    busy.value = false
  }
}

async function submitAll() {
  busy.value = true
  msg.value = ''
  try {
    await api.post(`/api/scores/${teamId.value}/submit`)
    msg.value = 'Все оценки по команде зафиксированы.'
  } catch {
    msg.value = 'Ошибка submit'
  } finally {
    busy.value = false
  }
}

onMounted(loadCriteria)
watch(teamId, loadCriteria)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Оценка команды #{{ teamId }}</h1>
    <p v-if="msg" class="mb-2 text-sm">{{ msg }}</p>
    <div class="space-y-4">
      <div v-for="c in criteria" :key="c.id" class="card bg-base-100 shadow">
        <div class="card-body gap-2">
          <h2 class="card-title text-base">{{ c.name }} (0 … {{ c.max_score }})</h2>
          <input
            v-model.number="values[c.id]"
            type="range"
            min="0"
            :max="c.max_score"
            step="0.5"
            class="range range-primary"
          />
          <div class="flex justify-between text-xs opacity-70">
            <span>0</span>
            <span>{{ values[c.id] }}</span>
            <span>{{ c.max_score }}</span>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" :disabled="busy" @click="saveCriterion(c.id)">
            Сохранить черновик
          </button>
        </div>
      </div>
    </div>
    <button type="button" class="btn btn-primary mt-6" :disabled="busy" @click="submitAll">Submit команду</button>
  </div>
</template>
