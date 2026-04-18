<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { onUserAvatarError, userAvatarSrc } from '../composables/useTeamPhotoFallback'

interface ExpertCaseBrief {
  case_id: number
  ordinal: number
  title: string
  company_name: string
}

interface Staff {
  user_id: string
  username: string
  avatar_url: string | null
  assigned_cases: ExpertCaseBrief[]
}

interface CaseRow {
  id: number
  ordinal: number
  title: string
  description: string | null
  company_name: string
  created_at: string
}

interface AboutPayload {
  intro: string
  updated_at: string
  experts: Staff[]
  admins: Staff[]
  cases: CaseRow[]
}

const auth = useAuthStore()
const data = ref<AboutPayload | null>(null)
const err = ref('')
const loading = ref(true)
const draftIntro = ref('')
const saving = ref(false)
const saveMsg = ref('')
const expertModal = ref<Staff | null>(null)

const isAdmin = computed(() => auth.role === 'admin')

function staffPhoto(s: Staff) {
  return userAvatarSrc(s.avatar_url)
}

async function load() {
  err.value = ''
  loading.value = true
  data.value = null
  try {
    const { data: d } = await api.get<AboutPayload>('/api/hackathon/about')
    data.value = {
      ...d,
      experts: (d.experts ?? []).map((x) => ({
        ...x,
        assigned_cases: x.assigned_cases ?? [],
      })),
      admins: (d.admins ?? []).map((x) => ({
        ...x,
        assigned_cases: x.assigned_cases ?? [],
      })),
    }
    draftIntro.value = d.intro ?? ''
  } catch {
    err.value = 'Не удалось загрузить страницу'
  } finally {
    loading.value = false
  }
}

async function saveIntro() {
  if (!isAdmin.value) return
  saveMsg.value = ''
  saving.value = true
  try {
    const { data: d } = await api.patch<AboutPayload>('/api/hackathon/about', {
      intro: draftIntro.value,
    })
    data.value = {
      ...d,
      experts: (d.experts ?? []).map((x) => ({ ...x, assigned_cases: x.assigned_cases ?? [] })),
      admins: (d.admins ?? []).map((x) => ({ ...x, assigned_cases: x.assigned_cases ?? [] })),
    }
    draftIntro.value = d.intro ?? ''
    saveMsg.value = 'Сохранено'
  } catch {
    saveMsg.value = 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

function resetDraft() {
  draftIntro.value = data.value?.intro ?? ''
  saveMsg.value = ''
}

function openExpertModal(e: Staff) {
  expertModal.value = e
}

function closeExpertModal() {
  expertModal.value = null
}

function onExpertKeydown(ev: KeyboardEvent, e: Staff) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault()
    openExpertModal(e)
  }
}

function onGlobalKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeExpertModal()
}

watch(expertModal, (v) => {
  if (typeof document === 'undefined') return
  if (v) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onGlobalKeydown)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onGlobalKeydown)
  }
})

onMounted(load)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onGlobalKeydown)
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 px-1 sm:px-0">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">площадка · vibe check</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">О хакатоне</h1>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        Один заход: что за формат, кто держит треки и жюри, какие кейсы в эфире — без занудства, зато с контекстом
        для гостей и команды.
      </p>
    </div>

    <p v-if="loading" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg text-cyan-500" />
    </p>
    <p v-else-if="err" class="text-center font-mono text-sm text-rose-400">{{ err }}</p>

    <template v-else-if="data">
      <section
        v-if="isAdmin"
        class="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900/60 p-5 shadow-xl backdrop-blur-sm"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-mono text-xs uppercase tracking-wider text-amber-200/90">Редактирование (админ)</h2>
          <p v-if="saveMsg" class="font-mono text-xs" :class="saveMsg === 'Сохранено' ? 'text-emerald-400' : 'text-rose-400'">
            {{ saveMsg }}
          </p>
        </div>
        <label class="block">
          <span class="sr-only">Текст о хакатоне</span>
          <textarea
            v-model="draftIntro"
            rows="6"
            class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-sans text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
            placeholder="Краткое описание хакатона для гостей…"
          />
        </label>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 font-mono text-xs text-amber-100 transition hover:bg-amber-500/25 disabled:opacity-40"
            :disabled="saving"
            @click="saveIntro"
          >
            Сохранить
          </button>
          <button
            type="button"
            class="rounded-lg border border-white/15 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-white/5"
            :disabled="saving"
            @click="resetDraft"
          >
            Сбросить
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 class="mb-3 font-mono text-xs uppercase tracking-wider text-cyan-400/90">Описание</h2>
        <p class="whitespace-pre-wrap leading-relaxed text-slate-300">{{ data.intro || 'Текст пока не задан.' }}</p>
        <p class="mt-4 font-mono text-[10px] text-slate-600">обновлено: {{ new Date(data.updated_at).toLocaleString('ru-RU') }}</p>
      </section>

      <section class="overflow-hidden rounded-2xl border border-violet-500/25 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 class="mb-4 font-mono text-xs uppercase tracking-wider text-violet-300/90">Эксперты жюри</h2>
        <p class="mb-3 text-xs text-slate-500">
          Нажми карточку — откроется мини-профиль: ник, аватар и кейсы, за которые отвечает эксперт.
        </p>
        <ul v-if="data.experts.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="e in data.experts"
            :key="e.user_id"
            role="button"
            tabindex="0"
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 outline-none transition hover:border-violet-400/40 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-400/50"
            @click="openExpertModal(e)"
            @keydown="onExpertKeydown($event, e)"
          >
            <img
              :src="staffPhoto(e)"
              :alt="e.username"
              class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-violet-500/30"
              @error="onUserAvatarError"
            />
            <div class="min-w-0 flex-1 text-left">
              <p class="truncate font-medium text-slate-100">@{{ e.username }}</p>
              <p class="font-mono text-[10px] text-violet-300/80">жюри · профиль по клику</p>
            </div>
            <span class="shrink-0 font-mono text-[10px] text-slate-500">→</span>
          </li>
        </ul>
        <p v-else class="font-mono text-sm text-slate-600">Список экспертов пуст.</p>
      </section>

      <section class="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 class="mb-4 font-mono text-xs uppercase tracking-wider text-amber-300/90">Администраторы</h2>
        <ul v-if="data.admins.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="a in data.admins"
            :key="a.user_id"
            class="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3"
          >
            <img
              :src="staffPhoto(a)"
              :alt="a.username"
              class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-amber-500/30"
              @error="onUserAvatarError"
            />
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-100">@{{ a.username }}</p>
              <p class="font-mono text-[10px] text-amber-300/80">админ</p>
            </div>
          </li>
        </ul>
        <p v-else class="font-mono text-sm text-slate-600">Список администраторов пуст.</p>
      </section>

      <section class="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
        <h2 class="mb-4 font-mono text-xs uppercase tracking-wider text-emerald-300/90">Кейсы</h2>
        <ul v-if="data.cases.length" class="grid gap-4 sm:grid-cols-2">
          <li
            v-for="c in data.cases"
            :key="c.id"
            class="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 to-emerald-950/20 p-4 transition hover:border-emerald-400/35"
          >
            <RouterLink :to="`/cases/${c.id}`" class="block">
              <p class="font-mono text-[10px] uppercase tracking-widest text-amber-300/90">
                №{{ c.ordinal }} · {{ c.company_name }}
              </p>
              <h3 class="mt-1 text-lg font-semibold text-slate-100">{{ c.title }}</h3>
              <p v-if="c.description" class="mt-2 line-clamp-3 text-sm text-slate-500">{{ c.description }}</p>
              <p class="mt-3 font-mono text-[10px] text-cyan-400/90">Страница кейса →</p>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="font-mono text-sm text-slate-600">Кейсы ещё не добавлены.</p>
      </section>

      <div class="flex flex-wrap justify-center gap-2 pt-2">
        <RouterLink
          to="/cases"
          class="rounded-full border border-white/15 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-white/5"
        >
          Все кейсы
        </RouterLink>
        <RouterLink
          to="/leaderboard"
          class="rounded-full border border-cyan-500/25 px-4 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-500/10"
        >
          Лидерборд
        </RouterLink>
      </div>

      <Teleport to="body">
        <div
          v-if="expertModal"
          class="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 pb-8 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Профиль эксперта"
          @click.self="closeExpertModal"
        >
          <div
            class="relative w-full max-w-md overflow-hidden rounded-3xl border border-violet-500/30 bg-slate-950 shadow-2xl shadow-violet-900/40"
            @click.stop
          >
            <button
              type="button"
              class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 font-mono text-lg text-slate-300 transition hover:bg-white/10"
              aria-label="Закрыть"
              @click="closeExpertModal"
            >
              ×
            </button>
            <div class="border-b border-white/10 bg-gradient-to-r from-violet-600/25 via-slate-900 to-cyan-600/20 px-6 pb-10 pt-6">
              <div class="flex items-start gap-4">
                <img
                  :src="staffPhoto(expertModal)"
                  :alt="expertModal.username"
                  class="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-violet-400/40"
                  @error="onUserAvatarError"
                />
                <div class="min-w-0 pt-1">
                  <p class="font-mono text-[10px] uppercase tracking-wider text-violet-300/90">ник на площадке</p>
                  <p class="truncate text-xl font-bold text-white">@{{ expertModal.username }}</p>
                  <p class="mt-1 font-mono text-[11px] text-slate-400">эксперт жюри · HackSwipe</p>
                </div>
              </div>
            </div>
            <div class="space-y-3 px-6 py-5">
              <p class="font-mono text-[10px] uppercase tracking-wider text-slate-500">кейсы эксперта</p>
              <ul v-if="expertModal.assigned_cases?.length" class="space-y-2">
                <li
                  v-for="c in expertModal.assigned_cases"
                  :key="c.case_id"
                  class="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 transition hover:border-cyan-500/35"
                >
                  <RouterLink :to="`/cases/${c.case_id}`" class="block" @click="closeExpertModal">
                    <p class="font-mono text-[10px] text-amber-300/90">№{{ c.ordinal }} · {{ c.company_name }}</p>
                    <p class="mt-0.5 font-medium text-slate-100">{{ c.title }}</p>
                    <p class="mt-1 font-mono text-[10px] text-cyan-400/80">страница кейса →</p>
                  </RouterLink>
                </li>
              </ul>
              <p v-else class="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-sm text-slate-500">
                Пока не закреплён ни за одним кейсом — уточни у админа, если ожидаешь назначение.
              </p>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
