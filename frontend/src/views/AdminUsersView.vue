<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/http'

interface UserRow {
  id: string
  email: string
  username: string
  role: string
  is_active: boolean
  is_blocked: boolean
}

const users = ref<UserRow[]>([])

async function load() {
  const { data } = await api.get<UserRow[]>('/api/users/')
  users.value = data
}

async function setRole(userId: string, role: string) {
  await api.patch(`/api/users/${userId}/role`, { role })
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Админ: пользователи</h1>
    <table class="table table-zebra">
      <thead>
        <tr>
          <th>Email</th>
          <th>Имя</th>
          <th>Роль</th>
          <th>Сменить роль</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.email }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.role }}</td>
          <td class="flex flex-wrap gap-1">
            <button type="button" class="btn btn-xs" @click="setRole(u.id, 'participant')">participant</button>
            <button type="button" class="btn btn-xs" @click="setRole(u.id, 'expert')">expert</button>
            <button type="button" class="btn btn-xs" @click="setRole(u.id, 'admin')">admin</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
