import { ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'

export interface TeamListItem {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

export function useResolvedTeamId(options?: { syncQueryWhenStaffDefaults?: boolean }) {
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const teamId: Ref<number | null> = ref(null)
  const err = ref('')
  const teamsList = ref<TeamListItem[]>([])
  const resolving = ref(false)

  function parseQueryTeamId(): number | null {
    const q = route.query.teamId
    const s = Array.isArray(q) ? q[0] : q
    if (s == null || s === '') return null
    const n = parseInt(String(s), 10)
    return Number.isFinite(n) ? n : null
  }

  function isStaff(): boolean {
    return auth.role === 'admin' || auth.role === 'expert'
  }

  async function loadTeamsList() {
    const { data } = await api.get<TeamListItem[]>('/api/teams/')
    teamsList.value = data
  }

  async function resolve() {
    resolving.value = true
    err.value = ''
    try {
      const fromQuery = parseQueryTeamId()
      if (fromQuery != null) {
        teamId.value = fromQuery
        if (isStaff() && !teamsList.value.length) {
          await loadTeamsList()
        }
        return
      }

      if (auth.role === 'participant') {
        try {
          const { data } = await api.get<{ team: { id: number } }>('/api/teams/my/summary')
          teamId.value = data.team.id
        } catch {
          teamId.value = null
          err.value = 'Сначала вступите в команду (регистрация или инвайт).'
        }
        return
      }

      if (isStaff()) {
        await loadTeamsList()
        if (!teamsList.value.length) {
          teamId.value = null
          err.value = 'В системе пока нет команд.'
          return
        }
        const first = teamsList.value[0].id
        teamId.value = first
        if (options?.syncQueryWhenStaffDefaults) {
          await router.replace({ path: route.path, query: { ...route.query, teamId: String(first) } })
        }
      }
    } finally {
      resolving.value = false
    }
  }

  function selectTeam(id: number) {
    teamId.value = id
    router.replace({ path: route.path, query: { ...route.query, teamId: String(id) } })
  }

  watch(
    () => route.query.teamId,
    () => {
      const n = parseQueryTeamId()
      if (n != null) {
        teamId.value = n
      }
    },
  )

  return {
    teamId,
    err,
    teamsList,
    resolving,
    resolve,
    selectTeam,
    parseQueryTeamId,
    isStaff,
    loadTeamsList,
  }
}
