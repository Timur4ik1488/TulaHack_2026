<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { apiErrorMessage } from '../utils/apiErrorMessage'

interface CaseTeamBrief {
  team_id: number
  team_name: string
}

interface CaseExpertRow {
  user_id: string
  username: string
}

interface CaseDetail {
  id: number
  ordinal: number
  title: string
  description: string | null
  company_name: string
  experts: CaseExpertRow[]
  expert_user_ids: string[]
  teams: CaseTeamBrief[]
}

interface TeamOpt {
  id: number
  name: string
}

interface UserOpt {
  id: string
  username: string
  role: string
}

const route = useRoute()
const auth = useAuthStore()
const detail = ref<CaseDetail | null>(null)
const teamsAll = ref<TeamOpt[]>([])
const usersAll = ref<UserOpt[]>([])
const err = ref('')
const msg = ref('')
const busy = ref(false)
const pickTeamId = ref(0)
const expertPick = ref<string[]>([])

const caseId = computed(() => Number(route.params.id))

function uidStr(id: string | undefined) {
  return id ? String(id).toLowerCase().replace(/-/g, '') : ''
}

const canManageTeams = computed(() => {
  if (auth.role === 'admin') return true
  if (auth.role === 'expert' && auth.user && detail.value) {
    const me = uidStr(auth.user.id)
    return (detail.value.expert_user_ids || []).some((x) => uidStr(String(x)) === me)
  }
  return false
})

const isAdmin = computed(() => auth.role === 'admin')

async function load() {
  err.value = ''
  detail.value = null
  try {
    const { data } = await api.get<CaseDetail>(`/api/cases/${caseId.value}`)
    detail.value = data
    expertPick.value = (data.experts || []).map((e) => String(e.user_id))
  } catch {
    err.value = 'Кейс не найден'
  }
}

async function loadTeams() {
  try {
    const { data } = await api.get<TeamOpt[]>('/api/teams/')
    teamsAll.value = data
  } catch {
    teamsAll.value = []
  }
}

async function loadUsers() {
  if (!isAdmin.value) return
  try {
    const { data } = await api.get<UserOpt[]>('/api/users/')
    usersAll.value = data.filter((u: UserOpt) => u.role === 'expert')
  } catch {
    usersAll.value = []
  }
}

async function assignTeam() {
  if (!detail.value || !pickTeamId.value) return
  busy.value = true
  msg.value = ''
  try {
    await api.post(`/api/cases/${detail.value.id}/teams`, { team_id: pickTeamId.value })
    await load()
    pickTeamId.value = 0
    msg.value = 'Команда добавлена к кейсу'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось добавить команду')
  } finally {
    busy.value = false
  }
}

async function removeTeam(teamId: number) {
  if (!detail.value) return
  busy.value = true
  msg.value = ''
  try {
    await api.delete(`/api/cases/${detail.value.id}/teams/${teamId}`)
    await load()
    msg.value = 'Команда откреплена'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось открепить')
  } finally {
    busy.value = false
  }
}

async function saveExperts() {
  if (!detail.value) return
  busy.value = true
  msg.value = ''
  try {
    await api.post(`/api/cases/${detail.value.id}/experts`, {
      user_ids: expertPick.value.map((id) => String(id)),
    })
    await load()
    msg.value = 'Эксперты кейса обновлены'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось сохранить экспертов')
  } finally {
    busy.value = false
  }
}

const expertOptions = computed(() => usersAll.value)

onMounted(async () => {
  await auth.fetchMe()
  await loadTeams()
  await loadUsers()
  await load()
})

watch(caseId, async () => {
  await load()
})
</script>

<template>
  <div v-if="detail" class="mx-auto max-w-3xl">
    <p class="mb-2 font-mono text-xs text-amber-400/90">
      кейс №{{ detail.ordinal }} · {{ detail.company_name }}
    </p>
    <h1 class="text-3xl font-bold text-slate-100">{{ detail.title }}</h1>
    <p v-if="detail.description" class="mt-4 whitespace-pre-wrap text-slate-400">{{ detail.description }}</p>

    <section class="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
      <h2 class="mb-2 font-mono text-sm uppercase tracking-wider text-slate-500">Эксперты кейса</h2>
      <ul v-if="detail.experts?.length" class="flex flex-wrap gap-2">
        <li
          v-for="e in detail.experts"
          :key="e.user_id"
          class="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-100"
        >
          @{{ e.username || e.user_id }}
        </li>
      </ul>
      <p v-else class="font-mono text-sm text-slate-600">Эксперты пока не назначены.</p>
    </section>

    <section class="mt-10">
      <h2 class="mb-3 font-mono text-sm uppercase tracking-wider text-cyan-500/80">Команды на кейсе</h2>
      <ul class="space-y-2">
        <li
          v-for="t in detail.teams"
          :key="t.team_id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3"
        >
          <RouterLink :to="`/teams/${t.team_id}`" class="font-medium text-cyan-200 hover:underline">
            {{ t.team_name }}
          </RouterLink>
          <button
            v-if="canManageTeams"
            type="button"
            class="rounded-lg border border-rose-500/30 px-2 py-1 font-mono text-[11px] text-rose-200 hover:bg-rose-500/15"
            :disabled="busy"
            @click="removeTeam(t.team_id)"
          >
            открепить
          </button>
        </li>
      </ul>
      <p v-if="!detail.teams.length" class="font-mono text-sm text-slate-600">Пока нет команд.</p>
    </section>

    <div
      v-if="canManageTeams"
      class="mt-8 rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-5"
    >
      <h3 class="font-mono text-sm text-cyan-100">Добавить команду</h3>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          v-model.number="pickTeamId"
          class="hs-select select select-bordered flex-1 border-white/15 py-3 font-mono text-sm text-slate-100"
        >
          <option :value="0" disabled>Выберите команду</option>
          <option v-for="x in teamsAll" :key="x.id" :value="x.id">{{ x.name }}</option>
        </select>
        <button
          type="button"
          class="btn border-0 bg-gradient-to-r from-cyan-600 to-emerald-600 font-mono text-slate-950"
          :disabled="busy || !pickTeamId"
          @click="assignTeam"
        >
          Закрепить
        </button>
      </div>
    </div>

    <div v-if="isAdmin" class="mt-8 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5">
      <h3 class="font-mono text-sm text-amber-100">Эксперты этого кейса</h3>
      <p class="mt-1 text-xs text-slate-500">Только они (и админ) могут закреплять команды за кейсом.</p>
      <div class="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3">
        <label v-for="u in expertOptions" :key="u.id" class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input v-model="expertPick" type="checkbox" class="checkbox checkbox-sm border-amber-500/40" :value="String(u.id)" />
          <span>@{{ u.username }}</span>
        </label>
        <p v-if="!expertOptions.length" class="text-xs text-slate-600">Нет пользователей с ролью expert в системе.</p>
      </div>
      <button
        type="button"
        class="btn mt-4 border-0 bg-gradient-to-r from-amber-600 to-orange-600 font-mono text-white"
        :disabled="busy"
        @click="saveExperts"
      >
        Сохранить экспертов
      </button>
    </div>

    <p v-if="msg" class="mt-4 font-mono text-xs text-slate-500">{{ msg }}</p>
  </div>
  <p v-else-if="err" class="text-center font-mono text-rose-400">{{ err }}</p>
  <div v-else class="flex justify-center py-20">
    <span class="loading loading-spinner loading-lg text-cyan-500" />
  </div>
</template>
