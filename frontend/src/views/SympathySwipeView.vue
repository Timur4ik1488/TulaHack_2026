<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { api } from '../api/http'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

const teams = ref<Team[]>([])
const index = ref(0)
const busy = ref(false)
const msg = ref('')

const dragX = ref(0)
const dragging = ref(false)
let startX = 0

const current = computed(() => teams.value[index.value] ?? null)
const nextTeam = computed(() => teams.value[index.value + 1] ?? null)
const nextNext = computed(() => teams.value[index.value + 2] ?? null)

const cardStyle = computed(() => {
  const r = dragX.value * 0.05
  return {
    transform: `translateX(${dragX.value}px) rotate(${r}deg)`,
    transition: dragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
  }
})

const plusHint = computed(() => Math.min(1, Math.max(0, dragX.value / 120)))
const minusHint = computed(() => Math.min(1, Math.max(0, -dragX.value / 120)))

interface LbRow {
  team_id: number
  team_name: string
  score: number
}

const leaderboard = ref<LbRow[]>([])

async function loadTeams() {
  const { data } = await api.get<Team[]>('/api/teams/')
  teams.value = data
  index.value = Math.min(index.value, Math.max(0, teams.value.length - 1))
}

async function loadLeaderboard() {
  const { data } = await api.get<{ rows: LbRow[] }>('/api/sympathy/leaderboard')
  leaderboard.value = data.rows.slice(0, 8)
}

onMounted(async () => {
  await loadTeams()
  await loadLeaderboard()
})

function onPointerDown(e: PointerEvent) {
  if (busy.value || !current.value) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragging.value = true
  startX = e.clientX
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  dragX.value = e.clientX - startX
}

async function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  dragging.value = false
  const dx = dragX.value
  const th = 88
  if (dx > th) {
    await postVote(1)
  } else if (dx < -th) {
    await postVote(-1)
  }
  dragX.value = 0
  await nextTick()
}

async function postVote(value: -1 | 1) {
  const team = current.value
  if (!team) return
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/sympathy/vote', {
      team_id: team.id,
      value,
    })
    msg.value = value === 1 ? 'Голос учтён: +1' : 'Голос учтён: −1'
    await loadLeaderboard()
    if (index.value < teams.value.length - 1) {
      index.value += 1
    }
  } catch (e: unknown) {
    const ax = e as { response?: { status?: number; data?: { detail?: string } } }
    const d = ax.response?.data?.detail
    msg.value = `Ошибка ${ax.response?.status ?? ''} ${typeof d === 'string' ? d : ''}`.trim()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <div class="mb-6 text-center">
      <p class="mb-2 font-mono text-xs text-violet-400/90">// зрительские симпатии · не жюри</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">Симпатии</h1>
      <p class="mt-2 text-sm text-slate-500">
        Только <span class="font-mono text-violet-300">+1</span> или
        <span class="font-mono text-violet-300">−1</span> — общее впечатление о команде. Не путается с оценкой жюри по
        критериям.
      </p>
    </div>

    <div class="relative mx-auto h-[min(34rem,72vh)] w-full max-w-md touch-none select-none">
      <div
        v-if="nextNext"
        class="absolute inset-x-4 top-10 h-[85%] rounded-3xl border border-white/5 bg-slate-900/40 shadow-xl"
      />
      <div
        v-if="nextTeam"
        class="absolute inset-x-2 top-6 h-[88%] rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl"
      />

      <div
        v-if="current"
        class="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-violet-500/20 bg-slate-900 shadow-2xl"
        :class="{
          'ring-2 ring-emerald-500/35': plusHint > 0.35,
          'ring-2 ring-rose-500/35': minusHint > 0.35,
        }"
        :style="cardStyle"
      >
        <div
          class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-emerald-500/15 font-mono text-4xl font-black uppercase tracking-widest text-emerald-200/90"
          :style="{ opacity: plusHint * 0.85 }"
        >
          +1
        </div>
        <div
          class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-rose-500/15 font-mono text-4xl font-black text-rose-200/90"
          :style="{ opacity: minusHint * 0.85 }"
        >
          −1
        </div>

        <div
          class="relative z-0 h-[52%] shrink-0 cursor-grab touch-none overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black active:cursor-grabbing"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            :src="teamPhotoSrc(current.photo_url)"
            :alt="current.name"
            class="h-full w-full object-cover"
            draggable="false"
            @error="onTeamPhotoError"
          />
        </div>

        <div class="relative z-10 flex flex-1 flex-col justify-between p-5">
          <div>
            <h2 class="font-mono text-xl font-bold tracking-tight text-white">{{ current.name }}</h2>
            <p v-if="current.description" class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
              {{ current.description }}
            </p>
          </div>
          <p class="font-mono text-[10px] text-slate-600">{{ index + 1 }} / {{ teams.length }}</p>
        </div>
      </div>

      <div
        v-else
        class="absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed border-white/15 bg-slate-900/50 p-8 text-center font-mono text-sm text-slate-500"
      >
        Нет команд для голосования
      </div>
    </div>

    <div class="mx-auto mt-8 flex max-w-md items-center justify-center gap-10 px-2">
      <button
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/50 bg-rose-500/10 text-2xl font-bold text-rose-200 shadow-lg transition hover:scale-105 disabled:opacity-40"
        :disabled="busy || !current"
        aria-label="Минус один"
        @click="postVote(-1)"
      >
        −1
      </button>
      <button
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-2xl font-bold text-emerald-200 shadow-lg transition hover:scale-105 disabled:opacity-40"
        :disabled="busy || !current"
        aria-label="Плюс один"
        @click="postVote(1)"
      >
        +1
      </button>
    </div>

    <p v-if="msg" class="mt-4 text-center font-mono text-xs text-slate-500">{{ msg }}</p>

    <div class="mt-10 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <h3 class="mb-3 font-mono text-xs uppercase tracking-wider text-slate-500">Топ по симпатиям</h3>
      <ol class="space-y-1.5 font-mono text-sm">
        <li v-for="(r, i) in leaderboard" :key="r.team_id" class="flex justify-between text-slate-300">
          <span>{{ i + 1 }}. {{ r.team_name }}</span>
          <span class="text-violet-300">{{ r.score > 0 ? '+' : '' }}{{ r.score }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>
