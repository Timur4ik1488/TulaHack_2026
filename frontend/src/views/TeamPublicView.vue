<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

interface TeamMemberRow {
  user_id: string
  username: string
  role: 'captain' | 'member'
}

const route = useRoute()
const auth = useAuthStore()
const team = ref<Team | null>(null)
const members = ref<TeamMemberRow[] | null>(null)
const err = ref('')

const id = computed(() => Number(route.params.id))

const coverSrc = computed(() => teamPhotoSrc(team.value?.photo_url))

const sortedMembers = computed(() => {
  if (!members.value?.length) return []
  return [...members.value].sort((a, b) => {
    const ra = a.role === 'captain' ? 0 : 1
    const rb = b.role === 'captain' ? 0 : 1
    return ra - rb
  })
})

async function load() {
  err.value = ''
  team.value = null
  members.value = null
  try {
    const { data } = await api.get<Team>(`/api/teams/${id.value}`)
    team.value = data
  } catch {
    err.value = '// 404 team not found'
  }
}

async function loadMembers() {
  if (!auth.user || !Number.isFinite(id.value)) {
    members.value = null
    return
  }
  try {
    const { data } = await api.get<TeamMemberRow[]>(`/api/teams/${id.value}/members`)
    members.value = data
  } catch {
    members.value = null
  }
}

onMounted(async () => {
  await load()
  await loadMembers()
})

watch(id, async () => {
  await load()
  await loadMembers()
})
</script>

<template>
  <div
    v-if="team"
    class="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-sm hs-glow-merge"
  >
    <div class="relative h-56 overflow-hidden bg-gradient-to-br from-slate-800 to-black md:h-72">
      <img :src="coverSrc" :alt="team.name" class="h-full w-full object-cover" @error="onTeamPhotoError" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      <div class="absolute bottom-4 left-6 right-6">
        <p v-if="team.case_number != null" class="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300/90">
          case #{{ team.case_number }}
        </p>
        <h1 class="font-mono text-2xl font-bold text-white drop-shadow md:text-3xl">{{ team.name }}</h1>
      </div>
    </div>
    <div class="space-y-8 p-8">
      <p v-if="team.description" class="whitespace-pre-wrap leading-relaxed text-slate-400">{{ team.description }}</p>

      <section v-if="sortedMembers.length" class="border-t border-white/10 pt-8">
        <p class="mb-4 font-mono text-xs uppercase tracking-widest text-cyan-500/80">// roster</p>
        <h2 class="mb-4 text-lg font-semibold text-slate-100">Участники</h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="m in sortedMembers"
            :key="m.user_id"
            class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-sm transition hover:border-cyan-500/20"
          >
            <span class="truncate font-medium text-slate-100">@{{ m.username }}</span>
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
              :class="
                m.role === 'captain'
                  ? 'border border-amber-400/40 bg-amber-500/15 text-amber-200'
                  : 'border border-cyan-400/35 bg-cyan-500/10 text-cyan-200'
              "
            >
              {{ m.role === 'captain' ? 'капитан' : 'участник' }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
  <p v-else-if="err" class="text-center font-mono text-rose-400">{{ err }}</p>
  <div v-else class="flex justify-center py-20">
    <span class="loading loading-spinner loading-lg text-cyan-500" />
  </div>
</template>
