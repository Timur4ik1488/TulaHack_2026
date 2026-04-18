<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'
import { externalUrl } from '../utils/externalUrl'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
  repo_url: string | null
  screenshots_json: string | null
}

interface Criterion {
  id: number
  name: string
  weight: number
  max_score: number
}

const route = useRoute()
const teams = ref<Team[]>([])
const criteria = ref<Criterion[]>([])
const criterionId = ref<number | null>(null)
const index = ref(0)
const busy = ref(false)
const msg = ref('')

const dragX = ref(0)
const dragging = ref(false)
let startX = 0

const current = computed(() => teams.value[index.value] ?? null)
const nextTeam = computed(() => teams.value[index.value + 1] ?? null)
const nextNext = computed(() => teams.value[index.value + 2] ?? null)
const selectedCriterion = computed(() => criteria.value.find((c) => c.id === criterionId.value) ?? null)

const cardStyle = computed(() => {
  const r = dragX.value * 0.05
  return {
    transform: `translateX(${dragX.value}px) rotate(${r}deg)`,
    transition: dragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
  }
})

const mergeHint = computed(() => Math.min(1, Math.max(0, dragX.value / 120)))
const skipHint = computed(() => Math.min(1, Math.max(0, -dragX.value / 120)))

function parseShots(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const currentShots = computed(() => parseShots(current.value?.screenshots_json ?? null))

function applyTeamQueryFromRoute() {
  const raw = route.query.team
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = s != null && s !== '' ? parseInt(String(s), 10) : NaN
  if (!Number.isFinite(n) || !teams.value.length) return
  const ix = teams.value.findIndex((t) => t.id === n)
  if (ix >= 0) {
    index.value = ix
  }
}

onMounted(async () => {
  const [t, c] = await Promise.all([
    api.get<Team[]>('/api/teams/'),
    api.get<Criterion[]>('/api/criteria/'),
  ])
  teams.value = t.data
  criteria.value = c.data
  if (c.data.length) {
    criterionId.value = c.data[0].id
  }
  applyTeamQueryFromRoute()
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
    await swipeRight()
  } else if (dx < -th) {
    await swipeLeft()
  }
  dragX.value = 0
  await nextTick()
}

async function postScore(value: number) {
  const team = current.value
  const crit = selectedCriterion.value
  if (!team || !crit) return
  busy.value = true
  msg.value = ''
  try {
    await api.post('/api/scores/', {
      team_id: team.id,
      criterion_id: crit.id,
      value,
    })
    msg.value = `// saved score=${value} for team_id=${team.id}`
    if (index.value < teams.value.length - 1) {
      index.value += 1
    }
  } catch (e: unknown) {
    const ax = e as { response?: { status?: number; data?: { detail?: string } } }
    const d = ax.response?.data?.detail
    msg.value = `// err: POST /api/scores/ ${ax.response?.status ?? ''} ${typeof d === 'string' ? d : ''}`.trim()
  } finally {
    busy.value = false
  }
}

function swipeRight() {
  const m = selectedCriterion.value?.max_score ?? 0
  return postScore(m)
}

function swipeLeft() {
  return postScore(0)
}

</script>

<template>
  <div class="mx-auto max-w-xl">
    <div class="mb-8 text-center">
      <p class="mb-2 font-mono text-xs text-fuchsia-400/90">// mode: jury · tinder_for_teams</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">Свайп команды</h1>
      <p class="mt-2 text-sm text-slate-500">
        Вправо — сразу max по выбранному критерию · Влево — сразу 0. Решение уходит в БД при отпускании карточки
        или по кнопкам ♥ / ✕.
      </p>
    </div>

    <div class="mb-6">
      <label class="block">
        <span class="mb-2 block font-mono text-xs uppercase tracking-wider text-slate-500">active criterion</span>
        <select
          v-model.number="criterionId"
          class="w-full cursor-pointer rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/20 focus:ring-2"
        >
          <option v-for="c in criteria" :key="c.id" :value="c.id">
            {{ c.name }} · max {{ c.max_score }}
          </option>
        </select>
      </label>
    </div>

    <div class="relative mx-auto h-[min(36rem,78vh)] w-full max-w-md touch-none select-none">
      <!-- стопка сзади -->
      <div
        v-if="nextNext"
        class="absolute inset-x-4 top-10 h-[85%] rounded-3xl border border-white/5 bg-slate-900/40 shadow-xl"
      />
      <div
        v-if="nextTeam"
        class="absolute inset-x-2 top-6 h-[88%] rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl"
      />

      <!-- главная карточка -->
      <div
        v-if="current"
        class="absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-white/10 bg-slate-900 shadow-2xl"
        :class="{
          'hs-glow-merge ring-2 ring-emerald-500/40': mergeHint > 0.35,
          'hs-glow-skip ring-2 ring-rose-500/40': skipHint > 0.35,
        }"
        :style="cardStyle"
      >
        <div
          class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-emerald-500/20 font-mono text-4xl font-black uppercase tracking-widest text-emerald-200/90"
          :style="{ opacity: mergeHint * 0.85 }"
        >
          merge
        </div>
        <div
          class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-rose-500/20 font-mono text-4xl font-black uppercase tracking-widest text-rose-200/90"
          :style="{ opacity: skipHint * 0.85 }"
        >
          skip
        </div>

        <!-- Свайп только по фото — ссылки в тексте кликабельны -->
        <div
          class="relative z-0 h-[55%] shrink-0 cursor-grab touch-none overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black active:cursor-grabbing"
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
            <a
              v-if="current.repo_url"
              :href="externalUrl(current.repo_url)"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-flex items-center gap-1 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              @pointerdown.stop
              @click.stop
            >
              репозиторий ↗
            </a>
            <div v-if="currentShots.length" class="mt-2 flex flex-wrap gap-2">
              <a
                v-for="(u, i) in currentShots"
                :key="i"
                :href="externalUrl(u)"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] text-slate-400 hover:text-cyan-300"
                @pointerdown.stop
                @click.stop
                >shot {{ i + 1 }}</a
              >
            </div>
            <p v-if="current.case_number != null" class="mt-2 font-mono text-xs text-slate-600">
              #issue-{{ current.case_number }}
            </p>
          </div>
          <p class="font-mono text-[10px] text-slate-600">
            {{ index + 1 }} / {{ teams.length }} · max={{ selectedCriterion?.max_score ?? '—' }}
          </p>
        </div>
      </div>

      <div
        v-else
        class="absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed border-white/15 bg-slate-900/50 p-8 text-center font-mono text-sm text-slate-500"
      >
        // queue empty — добавь команды (admin)
      </div>
    </div>

    <div class="mx-auto mt-8 flex max-w-md items-center justify-center gap-10 px-2">
      <button
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/50 bg-rose-500/10 text-2xl text-rose-300 shadow-lg shadow-rose-900/30 transition hover:scale-105 hover:bg-rose-500/20 disabled:opacity-40"
        :disabled="busy || !current"
        aria-label="Ноль баллов"
        @click="swipeLeft()"
      >
        ✕
      </button>
      <button
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-2xl text-emerald-300 shadow-lg shadow-emerald-900/30 transition hover:scale-105 hover:bg-emerald-500/20 disabled:opacity-40"
        :disabled="busy || !current"
        aria-label="Максимум баллов"
        @click="swipeRight()"
      >
        ♥
      </button>
    </div>

    <p v-if="msg" class="mt-6 text-center font-mono text-xs text-slate-500">{{ msg }}</p>
  </div>
</template>
