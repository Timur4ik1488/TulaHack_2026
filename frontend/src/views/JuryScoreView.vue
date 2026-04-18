<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '../api/http'
import { externalUrl } from '../utils/externalUrl'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Criterion {
  id: number
  name: string
  weight: number
  max_score: number
}

interface TeamCard {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
  repo_url: string | null
}

const route = useRoute()
const teamId = computed(() => Number(route.params.id))
const team = ref<TeamCard | null>(null)
const criteria = ref<Criterion[]>([])
const values = reactive<Record<number, number>>({})
const busy = ref(false)
const msg = ref('')
const teamErr = ref('')
const sympathyTotal = ref<number | null>(null)

const totalWeight = computed(() => criteria.value.reduce((s, c) => s + (c.weight || 0), 0))

async function loadTeam() {
  teamErr.value = ''
  team.value = null
  try {
    const { data } = await api.get<TeamCard>(`/api/teams/${teamId.value}`)
    team.value = data
  } catch {
    teamErr.value = 'Команда не найдена'
  }
}

async function loadCriteria() {
  const { data } = await api.get<Criterion[]>('/api/criteria/')
  criteria.value = data
  for (const c of data) {
    if (values[c.id] === undefined) {
      values[c.id] = 0
    }
  }
}

async function loadSympathyTotal() {
  sympathyTotal.value = null
  try {
    const { data } = await api.get<{ team_id: number; total: number }>(
      `/api/sympathy/team/${teamId.value}/total`,
    )
    sympathyTotal.value = data.total
  } catch {
    sympathyTotal.value = null
  }
}

async function loadAll() {
  await Promise.all([loadTeam(), loadCriteria(), loadSympathyTotal()])
}

async function saveCriterion(criterionId: number) {
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/scores/', {
      team_id: teamId.value,
      criterion_id: criterionId,
      value: values[criterionId],
    })
    msg.value = 'Черновик сохранён'
  } catch {
    msg.value = 'Не удалось сохранить оценку'
  } finally {
    busy.value = false
  }
}

async function submitAll() {
  busy.value = true
  msg.value = ''
  try {
    await api.post(`/api/scores/${teamId.value}/submit`)
    msg.value = 'Все оценки по команде зафиксированы.'
  } catch {
    msg.value = 'Ошибка фиксации — проверьте, что по каждому критерию есть черновик.'
  } finally {
    busy.value = false
  }
}

onMounted(loadAll)
watch(teamId, loadAll)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">жюри · карточка оценки</p>
      <h1
        class="bg-gradient-to-r from-cyan-200 via-white to-rose-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
      >
        Оценка команды
      </h1>
      <p class="mt-3 text-sm text-slate-500">
        Ползунок — твой голос по критерию. «Черновик» можно крутить сколько угодно; когда уверен —
        <span class="font-mono text-rose-300/90">зафиксировать команду</span> и закрыть сделку.
      </p>
    </div>

    <p v-if="teamErr" class="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
      {{ teamErr }}
    </p>

    <section
      v-else-if="team"
      class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-xl backdrop-blur-sm hs-glow-merge"
    >
      <div class="relative h-40 overflow-hidden md:h-48">
        <img
          :src="teamPhotoSrc(team.photo_url)"
          :alt="team.name"
          class="h-full w-full object-cover"
          @error="onTeamPhotoError"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div class="absolute bottom-3 left-4 right-4 flex flex-wrap items-end justify-between gap-2">
          <h2 class="font-mono text-xl font-bold text-white md:text-2xl">{{ team.name }}</h2>
          <span class="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            #{{ team.id }}
          </span>
        </div>
      </div>
      <div class="space-y-3 p-5">
        <p v-if="team.description" class="text-sm leading-relaxed text-slate-400">{{ team.description }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            :to="`/teams/${team.id}`"
            class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-200 transition hover:bg-cyan-500/20"
          >
            карточка команды →
          </RouterLink>
          <a
            v-if="team.repo_url"
            :href="externalUrl(team.repo_url)"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-200 transition hover:bg-emerald-500/20"
          >
            репозиторий ↗
          </a>
          <span
            v-if="sympathyTotal !== null"
            class="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 font-mono text-xs text-violet-200"
            title="Вайб зала: ±1 от зрителей, к жюри не прибавляется"
          >
            Симпатии
            <span class="ml-1 text-violet-100">{{ sympathyTotal > 0 ? '+' : '' }}{{ sympathyTotal }}</span>
          </span>
        </div>
        <p v-if="team.case_number != null" class="font-mono text-[11px] text-slate-600">кейс №{{ team.case_number }}</p>
      </div>
    </section>

    <section class="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <h3 class="font-mono text-xs uppercase tracking-widest text-slate-500">критерии</h3>
      <p class="mt-1 text-sm text-slate-400">
        Веса в сумме: <span class="font-mono text-cyan-300/90">{{ totalWeight }}%</span> — ориентир для важности критерия в итоговом %.
      </p>
    </section>

    <p v-if="msg" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center font-mono text-sm text-slate-300">
      {{ msg }}
    </p>

    <div class="space-y-5">
      <article
        v-for="c in criteria"
        :key="c.id"
        class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/20"
      >
        <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">{{ c.name }}</h2>
            <p class="mt-1 font-mono text-xs text-slate-500">
              вес <span class="text-amber-300/90">{{ c.weight }}%</span> · шкала 0 … {{ c.max_score }}
            </p>
          </div>
          <span class="rounded-full bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 px-3 py-1 font-mono text-sm font-bold text-white ring-1 ring-white/10">
            {{ values[c.id] ?? 0 }}
          </span>
        </div>
        <input
          v-model.number="values[c.id]"
          type="range"
          min="0"
          :max="c.max_score"
          step="0.5"
          class="range range-primary w-full"
        />
        <div class="mt-2 flex justify-between font-mono text-[10px] text-slate-600">
          <span>0</span>
          <span>{{ c.max_score }}</span>
        </div>
        <button
          type="button"
          class="btn btn-sm mt-4 w-full border border-white/10 bg-white/5 font-mono text-xs text-cyan-200 hover:bg-cyan-500/10"
          :disabled="busy"
          @click="saveCriterion(c.id)"
        >
          сохранить черновик
        </button>
      </article>
    </div>

    <div
      class="sticky bottom-4 z-10 rounded-2xl border border-rose-500/30 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md"
    >
      <p class="mb-3 text-center text-xs text-slate-500">
        После выставления баллов по всем критериям — фиксация для команды в лидерборде.
      </p>
      <button
        type="button"
        class="btn btn-block border-0 bg-gradient-to-r from-rose-500 to-amber-500 font-mono text-sm font-semibold text-white hover:opacity-95"
        :disabled="busy || !criteria.length"
        @click="submitAll"
      >
        зафиксировать команду
      </button>
    </div>
  </div>
</template>
