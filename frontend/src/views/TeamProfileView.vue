<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'

interface TeamRead {
  id: number
  name: string
  members: string
  contact: string
  description: string | null
  case_number: number | null
  photo_url: string | null
  invite_code: string | null
  repo_url: string | null
  screenshots_json: string | null
}

interface TeamMemberOut {
  user_id: string
  username: string
  role: 'captain' | 'member'
}

interface MyTeamSummary {
  team: TeamRead
  my_role: 'captain' | 'member'
  members: TeamMemberOut[]
  invite_code: string | null
}

const summary = ref<MyTeamSummary | null>(null)
const err = ref('')
const busy = ref(false)
const briefDesc = ref('')
const briefRepo = ref('')
const briefShots = ref('')
const joinCode = ref('')
const photoMsg = ref('')

const teamId = computed(() => summary.value?.team.id ?? NaN)
const isCaptain = computed(() => summary.value?.my_role === 'captain')

function parseShots(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const shotUrls = computed(() => parseShots(summary.value?.team.screenshots_json ?? null))

async function load() {
  err.value = ''
  summary.value = null
  try {
    const { data } = await api.get<MyTeamSummary>('/api/teams/my/summary')
    summary.value = data
    briefDesc.value = data.team.description ?? ''
    briefRepo.value = data.team.repo_url ?? ''
    briefShots.value = parseShots(data.team.screenshots_json).join('\n')
  } catch {
    err.value = 'Вы не в команде. Зарегистрируйтесь с инвайтом или создайте команду.'
  }
}

async function saveBrief() {
  if (!summary.value || !isCaptain.value) return
  busy.value = true
  photoMsg.value = ''
  try {
    const urls = briefShots.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await api.patch(`/api/teams/${summary.value.team.id}/brief`, {
      description: briefDesc.value || null,
      repo_url: briefRepo.value || null,
      screenshots_urls: urls,
    })
    await load()
    photoMsg.value = '// brief saved'
  } catch {
    photoMsg.value = '// err: PATCH brief'
  } finally {
    busy.value = false
  }
}

async function onPhotoChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !summary.value) return
  busy.value = true
  photoMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await api.post(`/api/teams/${summary.value.team.id}/photo`, fd)
    await load()
    photoMsg.value = '// photo uploaded'
  } catch {
    photoMsg.value = '// err: photo upload'
  } finally {
    busy.value = false
  }
}

async function joinByInvite() {
  busy.value = true
  photoMsg.value = ''
  try {
    const { data } = await api.post<MyTeamSummary>('/api/teams/join-by-invite', {
      invite_code: joinCode.value.trim(),
    })
    summary.value = data
    joinCode.value = ''
    err.value = ''
    briefDesc.value = data.team.description ?? ''
    briefRepo.value = data.team.repo_url ?? ''
    briefShots.value = parseShots(data.team.screenshots_json).join('\n')
    photoMsg.value = '// joined team'
  } catch {
    photoMsg.value = '// err: join-by-invite'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Моя команда</h1>

    <div v-if="err" class="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p class="mb-3">{{ err }}</p>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="joinCode"
          type="text"
          placeholder="код приглашения"
          class="input input-bordered input-sm flex-1 font-mono"
        />
        <button type="button" class="btn btn-primary btn-sm" :disabled="busy || !joinCode.trim()" @click="joinByInvite">
          Вступить
        </button>
        <RouterLink to="/register" class="btn btn-ghost btn-sm font-mono">register</RouterLink>
      </div>
    </div>

    <template v-else-if="summary">
      <div class="mb-4 flex flex-wrap gap-2">
        <RouterLink
          class="btn btn-sm font-mono"
          :to="{ path: '/team/chat', query: { teamId: String(teamId) } }"
        >
          Чат
        </RouterLink>
        <RouterLink
          class="btn btn-sm font-mono"
          :to="{ path: '/team/breakdown', query: { teamId: String(teamId) } }"
        >
          Diff оценок
        </RouterLink>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <figure v-if="summary.team.photo_url">
          <img :src="summary.team.photo_url" :alt="summary.team.name" class="max-h-64 w-full object-cover" />
        </figure>
        <div class="card-body">
          <h2 class="card-title">
            {{ summary.team.name }}
            <span class="badge badge-outline font-mono text-xs">{{ summary.my_role }}</span>
          </h2>
          <p v-if="summary.invite_code" class="font-mono text-sm text-cyan-300">
            invite_code: <span class="select-all">{{ summary.invite_code }}</span>
          </p>
          <p class="whitespace-pre-wrap text-sm"><strong>Состав (текст):</strong> {{ summary.team.members }}</p>
          <p class="text-sm"><strong>Контакт:</strong> {{ summary.team.contact }}</p>
          <p v-if="summary.team.repo_url" class="text-sm">
            <strong>Репозиторий:</strong>
            <a :href="summary.team.repo_url" class="link link-primary" target="_blank" rel="noopener">{{
              summary.team.repo_url
            }}</a>
          </p>
          <div v-if="shotUrls.length" class="mt-2 flex flex-wrap gap-2">
            <a v-for="(u, i) in shotUrls" :key="i" :href="u" target="_blank" rel="noopener" class="link text-xs">{{
              `скрин ${i + 1}`
            }}</a>
          </div>
          <p class="mt-2 text-sm text-slate-500">Участники:</p>
          <ul class="list-inside list-disc text-sm">
            <li v-for="m in summary.members" :key="m.user_id">
              @{{ m.username }} — {{ m.role }}
            </li>
          </ul>

          <div v-if="isCaptain" class="mt-6 border-t border-white/10 pt-4">
            <h3 class="mb-2 font-mono text-sm text-slate-400">Капитан: материалы для жюри</h3>
            <label class="mb-2 block text-xs uppercase text-slate-500">description</label>
            <textarea v-model="briefDesc" class="textarea textarea-bordered mb-3 w-full font-mono text-sm" rows="4" />
            <label class="mb-2 block text-xs uppercase text-slate-500">repo_url</label>
            <input v-model="briefRepo" type="url" class="input input-bordered mb-3 w-full font-mono text-sm" />
            <label class="mb-2 block text-xs uppercase text-slate-500">screenshots (URL по одному в строке)</label>
            <textarea v-model="briefShots" class="textarea textarea-bordered mb-3 w-full font-mono text-sm" rows="3" />
            <button type="button" class="btn btn-secondary btn-sm font-mono" :disabled="busy" @click="saveBrief">
              $ git push brief
            </button>
            <div class="mt-4">
              <label class="mb-1 block text-xs uppercase text-slate-500">team photo</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" @change="onPhotoChange" />
            </div>
          </div>
        </div>
      </div>
      <p v-if="photoMsg" class="mt-4 font-mono text-xs text-slate-500">{{ photoMsg }}</p>
    </template>

    <p v-else class="loading loading-spinner" />
  </div>
</template>
