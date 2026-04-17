<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'

interface Team {
  id: number
  name: string
  members: string
  contact: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

const teams = ref<Team[]>([])
const form = reactive({
  name: '',
  members: '',
  contact: '',
  description: '',
  case_number: '' as string | number,
  photo_url: '',
})

async function load() {
  const { data } = await api.get<Team[]>('/api/teams/')
  teams.value = data
}

async function createTeam() {
  await api.post('/api/teams/', {
    name: form.name,
    members: form.members,
    contact: form.contact,
    description: form.description || null,
    case_number: form.case_number === '' ? null : Number(form.case_number),
    photo_url: form.photo_url || null,
  })
  form.name = ''
  form.members = ''
  form.contact = ''
  form.description = ''
  form.case_number = ''
  form.photo_url = ''
  await load()
}

async function remove(id: number) {
  if (!confirm('Удалить команду?')) return
  await api.delete(`/api/teams/${id}`)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Админ: команды</h1>
    <div class="card mb-6 bg-base-100 shadow">
      <div class="card-body grid gap-2 md:grid-cols-2">
        <input v-model="form.name" class="input input-bordered" placeholder="Название" />
        <input v-model="form.contact" class="input input-bordered" placeholder="Контакт" />
        <textarea v-model="form.members" class="textarea textarea-bordered md:col-span-2" placeholder="Состав" />
        <textarea v-model="form.description" class="textarea textarea-bordered md:col-span-2" placeholder="Описание" />
        <input v-model="form.case_number" class="input input-bordered" placeholder="Номер кейса" type="number" />
        <input v-model="form.photo_url" class="input input-bordered" placeholder="URL фото" />
        <button type="button" class="btn btn-primary md:col-span-2" @click="createTeam">Создать</button>
      </div>
    </div>
    <table class="table table-zebra">
      <thead>
        <tr>
          <th>ID</th>
          <th>Название</th>
          <th>Фото</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in teams" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.name }}</td>
          <td>
            <img v-if="t.photo_url" :src="t.photo_url" class="h-10 w-10 rounded object-cover" alt="" />
          </td>
          <td>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="remove(t.id)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
