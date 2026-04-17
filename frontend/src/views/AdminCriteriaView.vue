<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'

interface Criterion {
  id: number
  name: string
  weight: number
  max_score: number
}

const criteria = ref<Criterion[]>([])
const summary = ref<{ total_weight_percent: number; weights_sum_ok: boolean } | null>(null)

const form = reactive({ name: '', weight: 10, max_score: 10 })

async function load() {
  const [c, s] = await Promise.all([
    api.get<Criterion[]>('/api/criteria/'),
    api.get<{ total_weight_percent: number; weights_sum_ok: boolean }>('/api/criteria/weights-summary'),
  ])
  criteria.value = c.data
  summary.value = s.data
}

async function createCriterion() {
  await api.post('/api/criteria/', {
    name: form.name,
    weight: form.weight,
    max_score: form.max_score,
  })
  form.name = ''
  form.weight = 10
  form.max_score = 10
  await load()
}

async function remove(id: number) {
  if (!confirm('Удалить критерий?')) return
  await api.delete(`/api/criteria/${id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Админ: критерии</h1>
    <p v-if="summary" class="mb-4 text-sm">
      Сумма весов: {{ summary.total_weight_percent }}%
      <span :class="summary.weights_sum_ok ? 'text-success' : 'text-warning'">
        {{ summary.weights_sum_ok ? '(OK ≈100%)' : '(не 100%)' }}
      </span>
    </p>
    <div class="card mb-6 bg-base-100 shadow">
      <div class="card-body flex flex-col gap-2 md:flex-row">
        <input v-model="form.name" class="input input-bordered flex-1" placeholder="Название" />
        <input v-model.number="form.weight" type="number" class="input input-bordered w-32" placeholder="Вес %" />
        <input v-model.number="form.max_score" type="number" class="input input-bordered w-32" placeholder="Max" />
        <button type="button" class="btn btn-primary" @click="createCriterion">Добавить</button>
      </div>
    </div>
    <table class="table table-zebra">
      <thead>
        <tr>
          <th>ID</th>
          <th>Название</th>
          <th>Вес %</th>
          <th>Max</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in criteria" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.name }}</td>
          <td>{{ c.weight }}</td>
          <td>{{ c.max_score }}</td>
          <td>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="remove(c.id)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
