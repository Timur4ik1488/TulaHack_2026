<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

interface Sheet {
  team_id: number
  criterion_id: number
  criterion_name: string
  max_score: number
  value: number
  is_final: boolean
}

const teams = ref<Team[]>([])
const mine = ref<Sheet[]>([])

onMounted(async () => {
  const [t, m] = await Promise.all([api.get<Team[]>('/api/teams/'), api.get<Sheet[]>('/api/scores/mine')])
  teams.value = t.data
  mine.value = m.data
})

function progressForTeam(teamId: number) {
  const rows = mine.value.filter((r) => r.team_id === teamId)
  if (!rows.length) {
    return 'ещё не оценивали'
  }
  const finals = rows.filter((r) => r.is_final).length
  return `${finals}/${rows.length} финал`
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="mb-10 text-center">
      <p class="mb-2 font-mono text-xs text-rose-400/80">жюри · основной поток</p>
      <h1
        class="bg-gradient-to-r from-rose-200 via-amber-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl"
      >
        Лента команд
      </h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-slate-500">
        Здесь жюри выставляет официальные баллы по критериям. Зрительские симпатии (+1/−1) — в разделе «Симпатии».
      </p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="t in teams"
        :key="t.id"
        class="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-xl transition hover:border-rose-400/25 hover:shadow-rose-900/20 hs-glow-merge"
      >
        <div class="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-800 to-black">
          <img
            :src="teamPhotoSrc(t.photo_url)"
            :alt="t.name"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            @error="onTeamPhotoError"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"
          />
          <div class="absolute bottom-0 left-0 right-0 p-5">
            <p v-if="t.case_number != null" class="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300/90">
              case #{{ t.case_number }}
            </p>
            <h2 class="line-clamp-2 text-xl font-bold leading-tight text-white">{{ t.name }}</h2>
            <p v-if="t.description" class="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {{ t.description }}
            </p>
          </div>
          <span
            class="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm"
          >
            #{{ t.id }}
          </span>
        </div>

        <div class="flex flex-1 flex-col justify-between gap-4 p-5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[11px] text-slate-500">прогресс</span>
            <span class="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-cyan-300/90">
              {{ progressForTeam(t.id) }}
            </span>
          </div>
          <div class="flex gap-2">
            <RouterLink
              :to="`/jury/score/${t.id}`"
              class="btn flex-1 border-0 bg-gradient-to-r from-rose-500 to-amber-500 font-mono text-xs font-semibold text-white shadow-lg shadow-rose-900/30 hover:opacity-95"
            >
              ♥ оценить
            </RouterLink>
            <RouterLink
              :to="{ path: '/team/breakdown', query: { teamId: String(t.id) } }"
              class="btn btn-ghost btn-sm border border-white/10 font-mono text-[10px] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-200"
            >
              %
            </RouterLink>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!teams.length" class="py-16 text-center font-mono text-sm text-slate-500">
      Пока нет команд в базе.
    </p>
  </div>
</template>
