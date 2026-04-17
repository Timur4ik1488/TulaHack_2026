import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/http'

export interface AuthUser {
  id: string
  email: string
  username: string
  role: 'admin' | 'expert' | 'participant'
  is_active: boolean
  is_blocked: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)

  const role = computed(() => user.value?.role ?? null)
  const isLoggedIn = computed(() => !!user.value)

  async function fetchMe() {
    loading.value = true
    try {
      const { data } = await api.get<AuthUser>('/api/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    await api.post('/api/auth/login', { email, password })
    await fetchMe()
  }

  interface NewTeamPayload {
    name: string
    contact: string
    description?: string | null
    repo_url?: string | null
    roster_line?: string | null
  }

  async function register(payload: {
    email: string
    username: string
    password: string
    invite_code?: string
    new_team?: NewTeamPayload
  }) {
    await api.post('/api/auth/register', payload)
    await fetchMe()
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      user.value = null
    }
  }

  return { user, loading, role, isLoggedIn, fetchMe, login, register, logout }
})
