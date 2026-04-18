<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface MemberRow {
  username: string
  role: string
}

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  case_ordinal?: number | null
  photo_url: string | null
  members?: MemberRow[]
}

interface MyVote {
  team_id: number
  value: number
}

const auth = useAuthStore()
const teams = ref<Team[]>([])
const index = ref(0)
const busy = ref(false)
const msg = ref('')
const myVotes = ref(new Map<number, number>())

const dragX = ref(0)
const dragging = ref(false)
let startX = 0
let activePointerId: number | null = null
/** Защита от двойного POST (повтор запроса с тем же team+value за короткое время). */
let lastVotePostKey = ''
let lastVotePostAt = 0

const current = computed(() => teams.value[index.value] ?? null)
const peekNextTeam = computed(() => teams.value[index.value + 1] ?? null)
const peekSecondTeam = computed(() => teams.value[index.value + 2] ?? null)

const cardStyle = computed(() => {
  const r = dragX.value * 0.05
  return {
    transform: `translateX(${dragX.value}px) rotate(${r}deg)`,
    transition: dragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
  }
})

const plusHint = computed(() => Math.min(1, Math.max(0, dragX.value / 120)))
const minusHint = computed(() => Math.min(1, Math.max(0, -dragX.value / 120)))

const currentVoteLabel = computed(() => {
  const t = current.value
  if (!t) return null
  const v = myVotes.value.get(t.id)
  if (v === undefined) return null
  return v > 0 ? '+1' : '−1'
})

interface LbRow {
  team_id: number
  team_name: string
  score: number
}

const leaderboard = ref<LbRow[]>([])

function storageKeyIdx(): string {
  const uid = auth.user?.id || 'guest'
  return `hs_sympathy_index_${uid}`
}

async function loadMyVotes() {
  try {
    const { data } = await api.get<MyVote[]>('/api/sympathy/me')
    const m = new Map<number, number>()
    for (const v of data) {
      m.set(v.team_id, v.value)
    }
    myVotes.value = m
  } catch {
    myVotes.value = new Map()
  }
}

function setMyVote(teamId: number, value: number) {
  const m = new Map(myVotes.value)
  m.set(teamId, value)
  myVotes.value = m
}

async function loadTeams() {
  const { data } = await api.get<Team[]>('/api/teams/')
  teams.value = data
}

function restoreIndex() {
  const n = teams.value.length
  if (!n) {
    index.value = 0
    return
  }
  const raw = localStorage.getItem(storageKeyIdx())
  const saved = raw != null ? parseInt(raw, 10) : NaN
  if (Number.isFinite(saved) && saved >= 0 && saved < n) {
    index.value = saved
    return
  }
  const firstUnvoted = teams.value.findIndex((t) => !myVotes.value.has(t.id))
  index.value = firstUnvoted >= 0 ? firstUnvoted : 0
}

function goToTeam(i: number) {
  const n = teams.value.length
  if (!n) return
  const j = Math.max(0, Math.min(n - 1, i))
  index.value = j
}

function prevTeam() {
  goToTeam(index.value - 1)
}

function goToNextTeam() {
  goToTeam(index.value + 1)
}

watch(index, (i) => {
  if (auth.user) {
    localStorage.setItem(storageKeyIdx(), String(i))
  }
})

async function loadLeaderboard() {
  try {
    const { data } = await api.get<{ rows: LbRow[] }>('/api/sympathy/leaderboard')
    leaderboard.value = (data.rows ?? []).slice(0, 8)
  } catch {
    /* не затираем предыдущий топ при сбое сети */
  }
}

onMounted(async () => {
  await auth.fetchMe()
  await loadTeams()
  await loadMyVotes()
  restoreIndex()
  await loadLeaderboard()
})

function onPointerDown(e: PointerEvent) {
  if (busy.value || !current.value) return
  activePointerId = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragging.value = true
  startX = e.clientX
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== activePointerId) return
  dragX.value = e.clientX - startX
}

async function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== activePointerId) return
  if (!dragging.value) return
  activePointerId = null
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
  const postKey = `${team.id}:${value}`
  const now = Date.now()
  if (postKey === lastVotePostKey && now - lastVotePostAt < 450) {
    return
  }
  lastVotePostKey = postKey
  lastVotePostAt = now
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/sympathy/vote', {
      team_id: team.id,
      value,
    })
    setMyVote(team.id, value)
    msg.value = value === 1 ? 'Голос учтён: +1' : 'Голос учтён: −1'
    await loadLeaderboard()
    if (index.value < teams.value.length - 1) {
      index.value += 1
    }
  } catch (e: unknown) {
    lastVotePostKey = ''
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
        <span class="font-mono text-violet-300">−1</span> — общее впечатление о команде. Новый голос по команде
        <span class="text-slate-400">заменяет</span> предыдущий (не суммируется).
      </p>
    </div>

    <div
      v-if="teams.length"
      class="mx-auto mb-4 flex max-w-xl flex-wrap items-center justify-center gap-2 px-1 font-mono text-[10px]"
    >
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-300 hover:border-violet-400/40 disabled:opacity-30"
        :disabled="index <= 0"
        @click="prevTeam"
      >
        ← назад
      </button>
      <button
        v-for="(t, i) in teams"
        :key="t.id"
        type="button"
        class="max-w-[7rem] truncate rounded-lg border px-2 py-1 transition"
        :class="
          i === index
            ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
            : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
        "
        :title="t.name"
        @click="goToTeam(i)"
      >
        {{ i + 1 }}. {{ t.name }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-300 hover:border-violet-400/40 disabled:opacity-30"
        :disabled="index >= teams.length - 1"
        @click="goToNextTeam"
      >
        вперёд →
      </button>
    </div>

    <div class="relative mx-auto h-[min(34rem,72vh)] w-full max-w-md touch-none select-none">
      <div
        v-if="peekSecondTeam"
        class="absolute inset-x-4 top-10 h-[85%] rounded-3xl border border-white/5 bg-slate-900/40 shadow-xl"
      />
      <div
        v-if="peekNextTeam"
        class="absolute inset-x-2 top-6 h-[88%] rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl"
      />

      <div
        v-if="current"
        class="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-3xl border-2 border-violet-500/20 bg-slate-900 shadow-2xl active:cursor-grabbing"
        :class="{
          'ring-2 ring-emerald-500/35': plusHint > 0.35,
          'ring-2 ring-rose-500/35': minusHint > 0.35,
        }"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
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

        <div class="relative z-0 h-[52%] shrink-0 touch-none overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          <img
            :src="teamPhotoSrc(current.photo_url)"
            :alt="current.name"
            class="h-full w-full object-cover pointer-events-none"
            draggable="false"
            @error="onTeamPhotoError"
          />
        </div>

        <div class="relative z-10 flex flex-1 flex-col justify-between p-5">
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <h2 class="font-mono text-xl font-bold tracking-tight text-white">{{ current.name }}</h2>
              <span
                v-if="currentVoteLabel"
                class="rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] text-violet-200"
              >
                ваш голос: {{ currentVoteLabel }}
              </span>
            </div>
            <p v-if="current.description" class="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
              {{ current.description }}
            </p>
            <p
              v-if="(current.case_ordinal ?? current.case_number) != null"
              class="mt-2 font-mono text-[10px] text-amber-300/85"
            >
              кейс №{{ current.case_ordinal ?? current.case_number }}
            </p>
            <p v-if="current.members?.length" class="mt-1 line-clamp-2 font-mono text-[10px] text-slate-500">
              {{ current.members.map((m) => '@' + m.username).join(' · ') }}
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
