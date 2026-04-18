<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useResolvedTeamId } from '../composables/useResolvedTeamId'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface CriterionRow {
  criterion_id: number
  criterion_name: string
  weight_percent: number
  max_score: number
  avg_expert_score: number
  criterion_fill_percent: number
  weighted_contribution_percent: number
}

interface Breakdown {
  team_id: number
  team_name: string
  total_percent: number
  criteria: CriterionRow[]
}

const data = ref<Breakdown | null>(null)
const loadErr = ref('')

const { teamId, err, teamsList, resolving, resolve, selectTeam, isStaff } = useResolvedTeamId({
  syncQueryWhenStaffDefaults: true,
})

const teamIdNum = computed(() => teamId.value ?? NaN)
const staff = computed(() => isStaff())

async function load() {
  loadErr.value = ''
  data.value = null
  if (!Number.isFinite(teamIdNum.value)) {
    return
  }
  try {
    const res = await api.get<Breakdown>(`/api/scores/team/${teamIdNum.value}/breakdown`)
    data.value = res.data
  } catch {
    loadErr.value = 'Не удалось загрузить разбор оценок для этой команды.'
  }
}

onMounted(async () => {
  await resolve()
  await load()
})

watch(teamIdNum, async () => {
  await load()
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-8 text-center">
      <p class="mb-2 font-mono text-xs text-rose-400/80">// разбор баллов по критериям</p>
      <h1 class="bg-gradient-to-r from-rose-200 via-amber-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
        Оценки команды
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ staff ? 'Выберите команду — как карточку в ленте.' : 'Ваш вклад по критериям и итог в процентах.' }}
      </p>
    </div>

    <p v-if="err" class="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
      {{ err }}
    </p>

    <div
      v-else-if="staff && teamsList.length"
      class="mb-8 -mx-1 flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
    >
      <button
        v-for="t in teamsList"
        :key="t.id"
        type="button"
        class="group relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl border transition"
        :class="
          t.id === teamId
            ? 'border-rose-400/60 ring-2 ring-rose-400/30'
            : 'border-white/10 hover:border-rose-300/30'
        "
        @click="selectTeam(t.id)"
      >
        <img
          :src="teamPhotoSrc(t.photo_url)"
          :alt="t.name"
          class="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
          @error="onTeamPhotoError"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"
        />
        <span class="absolute bottom-2 left-2 right-2 truncate text-left text-xs font-semibold text-white">
          {{ t.name }}
        </span>
      </button>
    </div>

    <p v-if="loadErr" class="mb-4 text-center font-mono text-sm text-rose-400">{{ loadErr }}</p>

    <div v-else-if="data" class="space-y-6">
      <div
        class="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-sm hs-glow-merge"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl"
        />
        <div
          class="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <div class="relative flex flex-col items-center text-center">
          <p class="font-mono text-xs uppercase tracking-widest text-slate-500">итоговый балл</p>
          <h2 class="mt-2 max-w-full truncate text-2xl font-bold text-white">{{ data.team_name }}</h2>
          <div
            class="mt-6 flex h-36 w-36 items-center justify-center rounded-full border-4 border-rose-400/40 bg-gradient-to-br from-rose-500/30 to-amber-500/20 font-mono text-4xl font-bold text-white shadow-inner"
          >
            {{ Math.round(data.total_percent) }}%
          </div>
          <p class="mt-4 text-sm text-slate-400">Итог по взвешенным критериям (среднее жюри).</p>
        </div>
      </div>

      <ul class="space-y-4">
        <li
          v-for="c in data.criteria"
          :key="c.criterion_id"
          class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-sm transition hover:border-cyan-500/20"
        >
          <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p class="font-medium text-slate-100">{{ c.criterion_name }}</p>
              <p class="mt-0.5 font-mono text-xs text-slate-500">
                вес {{ c.weight_percent }}% · max {{ c.max_score }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-mono text-sm text-cyan-300">
                {{ c.avg_expert_score }} / {{ c.max_score }}
              </p>
              <p class="font-mono text-xs text-emerald-400/90">+{{ c.weighted_contribution_percent }}% к итогу</p>
            </div>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/5">
            <div
              class="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 transition-all"
              :style="{ width: `${Math.min(100, Math.max(0, c.criterion_fill_percent))}%` }"
            />
          </div>
        </li>
      </ul>

      <div class="flex flex-wrap justify-center gap-2 pt-2">
        <RouterLink
          v-if="Number.isFinite(teamIdNum)"
          class="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
          :to="{ path: '/team/chat', query: { teamId: String(teamIdNum) } }"
        >
          чат этой команды →
        </RouterLink>
        <RouterLink
          to="/leaderboard"
          class="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
        >
          лидерборд
        </RouterLink>
      </div>
    </div>

    <div v-else-if="resolving || (Number.isFinite(teamIdNum) && !data && !loadErr)" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg text-rose-400" />
    </div>
  </div>
</template>
