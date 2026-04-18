<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { onTeamPhotoError, onUserAvatarError, teamPhotoSrc, userAvatarSrc } from '../composables/useTeamPhotoFallback'
import { apiErrorMessage } from '../utils/apiErrorMessage'

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
  solution_submission_url: string | null
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

const auth = useAuthStore()
const summary = ref<MyTeamSummary | null>(null)
const err = ref('')
const busy = ref(false)
const briefDesc = ref('')
const briefRepo = ref('')
const briefShots = ref('')
const briefSolution = ref('')
const submissionOpen = ref(true)
const joinCode = ref('')
const photoMsg = ref('')
const avatarBusy = ref(false)
const avatarMsg = ref('')
const inviteCopied = ref(false)
let inviteCopyTimer: ReturnType<typeof setTimeout> | null = null

const isStaff = computed(() => auth.role === 'admin' || auth.role === 'expert')
const isParticipant = computed(() => auth.role === 'participant')

const tgBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HackSwipeBot'

let timerPoll: ReturnType<typeof setInterval> | null = null

async function pollSubmissionWindow() {
  try {
    const { data } = await api.get<{ submission_window_open?: boolean }>('/api/timer/')
    submissionOpen.value = data.submission_window_open !== false
  } catch {
    /* */
  }
}

async function openTelegramBind() {
  try {
    const { data } = await api.post<{ url: string }>('/api/telegram/deeplink')
    window.open(data.url, '_blank', 'noopener,noreferrer')
  } catch {
    photoMsg.value = 'Не удалось получить ссылку на бота (войдите заново?)'
  }
}

function accountRoleLabel(role: string | undefined) {
  if (!role) return ''
  if (role === 'admin') return 'admin'
  if (role === 'expert') return 'Жюри'
  if (role === 'participant') return 'Участник'
  return role
}

const teamId = computed(() => summary.value?.team.id ?? NaN)
const isCaptain = computed(() => summary.value?.my_role === 'captain')

async function onUserAvatarChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarBusy.value = true
  avatarMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await api.post('/api/users/me/avatar', fd)
    await auth.fetchMe()
    avatarMsg.value = 'Аватар обновлён'
  } catch (e) {
    avatarMsg.value = apiErrorMessage(e, 'Не удалось загрузить аватар')
  } finally {
    avatarBusy.value = false
  }
}

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

const repoCard = computed(() => {
  const raw = summary.value?.team.repo_url?.trim()
  if (!raw) return null
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./, '')
    const pathRaw = (parsed.pathname + parsed.search).replace(/\/+$/, '') || '/'
    const pathShort = pathRaw.length > 56 ? `${pathRaw.slice(0, 53)}…` : pathRaw
    let brand = 'Репозиторий'
    if (host.includes('github')) brand = 'GitHub'
    else if (host.includes('gitlab')) brand = 'GitLab'
    else if (host.includes('bitbucket')) brand = 'Bitbucket'
    return { href: parsed.href, host, pathShort, brand }
  } catch {
    return {
      href: normalized,
      host: '',
      pathShort: raw.length > 64 ? `${raw.slice(0, 61)}…` : raw,
      brand: 'Ссылка',
    }
  }
})

function isLikelyImageUrl(u: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(u.trim())
}

async function copyInviteCode() {
  const code = summary.value?.invite_code
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    inviteCopied.value = true
    if (inviteCopyTimer) clearTimeout(inviteCopyTimer)
    inviteCopyTimer = setTimeout(() => {
      inviteCopied.value = false
    }, 2000)
  } catch {
    photoMsg.value = 'Не удалось скопировать — выделите код вручную'
  }
}

async function load() {
  err.value = ''
  summary.value = null
  try {
    const { data } = await api.get<MyTeamSummary>('/api/teams/my/summary')
    summary.value = data
    briefDesc.value = data.team.description ?? ''
    briefRepo.value = data.team.repo_url ?? ''
    briefShots.value = parseShots(data.team.screenshots_json).join('\n')
    briefSolution.value = data.team.solution_submission_url ?? ''
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
      solution_submission_url: briefSolution.value.trim() || null,
    })
    await load()
    photoMsg.value = 'Материалы для жюри сохранены'
  } catch (e) {
    photoMsg.value = apiErrorMessage(e, 'Не удалось сохранить материалы')
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
    photoMsg.value = 'Фото команды обновлено'
  } catch (e) {
    photoMsg.value = apiErrorMessage(e, 'Ошибка загрузки фото команды')
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
    briefSolution.value = data.team.solution_submission_url ?? ''
    photoMsg.value = 'Вы в команде'
  } catch (e) {
    photoMsg.value = apiErrorMessage(e, 'Не удалось вступить по коду')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (isParticipant.value) {
    void load()
    void pollSubmissionWindow()
    timerPoll = setInterval(pollSubmissionWindow, 10000)
  }
})

onUnmounted(() => {
  if (inviteCopyTimer) clearTimeout(inviteCopyTimer)
  if (timerPoll) clearInterval(timerPoll)
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <!-- Staff: админ / жюри — без обязательной команды -->
    <template v-if="isStaff && auth.user">
      <div class="mb-8 text-center">
        <p class="mb-2 font-mono text-xs text-rose-400/80">профиль · аккаунт</p>
        <h1
          class="bg-gradient-to-r from-rose-200 via-amber-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
        >
          Профиль
        </h1>
        <p class="mt-2 text-sm text-slate-500">Команда не нужна — полный доступ к ленте и оценкам.</p>
      </div>

      <div
        class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-skip"
      >
        <div class="relative h-36 bg-gradient-to-br from-rose-500 via-amber-500 to-cyan-500">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
        </div>
        <div class="relative -mt-14 px-6 pb-8">
          <div
            class="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-slate-950 shadow-xl ring-2 ring-rose-400/30"
          >
            <img
              :src="userAvatarSrc(auth.user.avatar_url)"
              alt=""
              class="h-full w-full object-cover"
              @error="onUserAvatarError"
            />
          </div>
          <h2 class="mt-4 text-2xl font-bold text-white">@{{ auth.user.username }}</h2>
          <p class="text-sm text-slate-400">{{ auth.user.email }}</p>
          <span
            class="mt-3 inline-flex rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider"
            :class="
              auth.user.role === 'admin'
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
            "
          >
            {{ accountRoleLabel(auth.user.role) }}
          </span>
          <div class="mt-4">
            <p class="font-mono text-[10px] uppercase tracking-wider text-slate-500">аватар</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="mt-1 block max-w-xs text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2 file:py-1 file:font-mono file:text-slate-200"
              :disabled="avatarBusy"
              @change="onUserAvatarChange"
            />
            <p v-if="avatarMsg" class="mt-1 font-mono text-[11px] text-cyan-400/90">{{ avatarMsg }}</p>
          </div>
        </div>

        <div class="grid gap-3 border-t border-white/5 px-6 pb-8 sm:grid-cols-2">
          <RouterLink
            to="/sympathy"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-violet-400/35 hover:bg-violet-500/10"
          >
            <span class="text-sm font-medium text-slate-100">Симпатии</span>
            <span class="font-mono text-xs text-violet-300">→</span>
          </RouterLink>
          <RouterLink
            to="/jury/teams"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10"
          >
            <span class="text-sm font-medium text-slate-100">Команды для оценки</span>
            <span class="font-mono text-xs text-cyan-300">→</span>
          </RouterLink>
          <RouterLink
            to="/team/breakdown"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-amber-400/35 hover:bg-amber-500/10"
          >
            <span class="text-sm font-medium text-slate-100">Оценки</span>
            <span class="font-mono text-xs text-amber-200">→</span>
          </RouterLink>
          <RouterLink
            to="/team/chat"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/35 hover:bg-emerald-500/10"
          >
            <span class="text-sm font-medium text-slate-100">Чаты команд</span>
            <span class="font-mono text-xs text-emerald-300">→</span>
          </RouterLink>
          <RouterLink
            to="/leaderboard"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20 sm:col-span-2"
          >
            <span class="text-sm font-medium text-slate-100">Лидерборд</span>
            <span class="font-mono text-xs text-slate-400">→</span>
          </RouterLink>
          <RouterLink
            to="/cases"
            class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:col-span-2"
          >
            <span class="text-sm font-medium text-slate-100">Кейсы</span>
            <span class="font-mono text-xs text-cyan-300">→</span>
          </RouterLink>
          <a
            :href="`https://t.me/${tgBotUsername}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-between rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 transition hover:border-sky-400/40 sm:col-span-2"
          >
            <span class="text-sm font-medium text-sky-100">Telegram</span>
            <span class="font-mono text-xs text-sky-300">↗</span>
          </a>
          <button
            type="button"
            class="rounded-2xl border border-sky-400/30 bg-black/30 px-4 py-3 text-left text-sm text-sky-100 transition hover:bg-sky-500/15 sm:col-span-2"
            @click="openTelegramBind"
          >
            Привязать TG для уведомлений о таймере
          </button>
          <template v-if="auth.user.role === 'admin'">
            <RouterLink
              to="/admin/teams"
              class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Команды (админ)
            </RouterLink>
            <RouterLink
              to="/admin/criteria"
              class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Критерии
            </RouterLink>
            <RouterLink
              to="/admin/users"
              class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Пользователи
            </RouterLink>
            <RouterLink
              to="/timer"
              class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
            >
              Таймер
            </RouterLink>
            <a
              href="/ops/grafana/"
              class="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-center text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Метрики (Grafana)
            </a>
          </template>
        </div>
      </div>
    </template>

    <!-- Участник: моя команда -->
    <template v-else-if="isParticipant">
      <div
        v-if="auth.user"
        class="mb-8 flex flex-wrap items-center gap-4 rounded-3xl border border-cyan-500/15 bg-slate-900/50 p-5 shadow-lg shadow-cyan-950/20 backdrop-blur-md"
      >
        <img
          :src="userAvatarSrc(auth.user.avatar_url)"
          alt=""
          class="h-16 w-16 shrink-0 rounded-2xl border-2 border-cyan-400/35 object-cover shadow-lg shadow-cyan-900/30 ring-2 ring-cyan-500/15"
          @error="onUserAvatarError"
        />
        <div class="min-w-0 flex-1">
          <p class="font-mono text-[10px] uppercase tracking-wider text-cyan-500/70">ваш профиль</p>
          <p class="mt-0.5 text-sm text-slate-400">Аватар виден в чате и на карточках команды.</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="mt-2 block max-w-xs text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-cyan-600/80 file:to-emerald-600/80 file:px-3 file:py-1.5 file:font-mono file:text-white"
            :disabled="avatarBusy"
            @change="onUserAvatarChange"
          />
          <p v-if="avatarMsg" class="mt-1 font-mono text-[11px] text-emerald-400/90">{{ avatarMsg }}</p>
        </div>
      </div>

      <div class="mb-8 text-center">
        <p class="mb-2 font-mono text-xs text-cyan-500/80">моя команда · HQ</p>
        <h1
          class="bg-gradient-to-r from-cyan-200 via-white to-emerald-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
        >
          Моя команда
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Карточка команды в стиле сайта: репозиторий, материалы и состав — в одном месте.
        </p>
      </div>

      <div
        v-if="err"
        class="mb-8 rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-slate-900/60 p-5 text-sm text-amber-50 shadow-lg backdrop-blur-sm"
      >
        <p class="mb-4 font-medium">{{ err }}</p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            v-model="joinCode"
            type="text"
            placeholder="код приглашения"
            class="input input-bordered input-sm flex-1 border-white/15 bg-black/40 font-mono text-cyan-100 placeholder:text-slate-600"
          />
          <button
            type="button"
            class="btn shrink-0 border-0 bg-gradient-to-r from-cyan-600 to-emerald-600 font-mono text-slate-950 hover:opacity-95"
            :disabled="busy || !joinCode.trim()"
            @click="joinByInvite"
          >
            Вступить
          </button>
          <RouterLink
            to="/register"
            class="btn btn-ghost btn-sm shrink-0 border border-white/10 font-mono text-slate-300"
          >
            Регистрация
          </RouterLink>
        </div>
      </div>

      <template v-else-if="summary">
        <div class="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          <RouterLink
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-md shadow-cyan-950/20 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
            :to="{ path: '/team/chat', query: { teamId: String(teamId) } }"
          >
            <span>Чат команды</span>
            <span class="font-mono text-xs text-cyan-300/90">→</span>
          </RouterLink>
          <RouterLink
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 shadow-md shadow-rose-950/20 transition hover:border-rose-400/45 hover:bg-rose-500/20"
            :to="{ path: '/team/breakdown', query: { teamId: String(teamId) } }"
          >
            <span>Оценки</span>
            <span class="font-mono text-xs text-rose-300/90">→</span>
          </RouterLink>
            <RouterLink
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/10"
            :to="`/teams/${teamId}`"
          >
            <span>Публичная карточка</span>
            <span class="font-mono text-xs text-emerald-300/90">→</span>
          </RouterLink>
          <RouterLink
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/35 hover:bg-cyan-500/10"
            to="/cases"
          >
            <span>Кейсы</span>
            <span class="font-mono text-xs text-cyan-300/90">→</span>
          </RouterLink>
          <a
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-400/45"
            :href="`https://t.me/${tgBotUsername}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Telegram</span>
            <span class="font-mono text-xs text-sky-300/90">↗</span>
          </a>
          <button
            type="button"
            class="flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-black/30 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15"
            @click="openTelegramBind"
          >
            <span>TG уведомления</span>
            <span class="font-mono text-xs text-sky-300/90">↗</span>
          </button>
        </div>

        <div
          class="overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/55 shadow-2xl shadow-cyan-950/25 backdrop-blur-md hs-glow-merge"
        >
          <figure class="relative h-48 overflow-hidden sm:h-56">
            <img
              :src="teamPhotoSrc(summary.team.photo_url)"
              :alt="summary.team.name"
              class="h-full w-full object-cover"
              @error="onTeamPhotoError"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/15"
            />
          </figure>

          <div class="relative -mt-10 px-5 pb-8 pt-0 sm:-mt-12 sm:px-8">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div class="min-w-0">
                <h2 class="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">
                  {{ summary.team.name }}
                </h2>
                <span
                  class="mt-2 inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide"
                  :class="
                    summary.my_role === 'captain'
                      ? 'border-amber-400/45 bg-amber-500/15 text-amber-100'
                      : 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100'
                  "
                >
                  {{ summary.my_role === 'captain' ? 'Вы — капитан' : 'Участник команды' }}
                </span>
              </div>

              <div
                v-if="summary.invite_code"
                class="w-full shrink-0 rounded-2xl border border-cyan-500/35 bg-slate-950/70 p-4 shadow-inner shadow-black/40 sm:max-w-xs"
              >
                <p class="font-mono text-[10px] uppercase tracking-wider text-cyan-500/80">пригласить в команду</p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <code class="select-all flex-1 break-all font-mono text-lg font-semibold tracking-wider text-cyan-200">{{
                    summary.invite_code
                  }}</code>
                  <button
                    type="button"
                    class="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-xs text-cyan-100 transition hover:bg-cyan-500/25"
                    @click="copyInviteCode"
                  >
                    Копировать
                  </button>
                </div>
                <p v-if="inviteCopied" class="mt-2 font-mono text-[11px] text-emerald-400">Скопировано в буфер</p>
              </div>
            </div>

            <div class="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-2">
              <div>
                <p class="font-mono text-[10px] uppercase tracking-wider text-slate-500">состав (строка)</p>
                <p class="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {{ summary.team.members }}
                </p>
              </div>
              <div>
                <p class="font-mono text-[10px] uppercase tracking-wider text-slate-500">контакт для организаторов</p>
                <p class="mt-1.5 text-sm text-slate-300">{{ summary.team.contact }}</p>
              </div>
            </div>

            <a
              v-if="repoCard"
              :href="repoCard.href"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 px-4 py-4 transition hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-900/25"
            >
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/20 text-cyan-200 ring-1 ring-cyan-400/25"
              >
                <span class="font-mono text-xl font-bold text-cyan-100">&lt;/&gt;</span>
              </div>
              <div class="min-w-0 flex-1 text-left">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90">{{ repoCard.brand }}</p>
                <p class="truncate font-mono text-sm text-slate-100">
                  <span v-if="repoCard.host" class="text-slate-400">{{ repoCard.host }}</span>{{ repoCard.pathShort }}
                </p>
                <p class="mt-1 font-mono text-[10px] text-slate-500">Открыть репозиторий в новой вкладке →</p>
              </div>
            </a>

            <div v-if="shotUrls.length" class="mt-6">
              <p class="mb-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">скриншоты и ссылки</p>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <template v-for="(u, i) in shotUrls" :key="i">
                  <a
                    v-if="isLikelyImageUrl(u)"
                    :href="u"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 shadow-md"
                  >
                    <img :src="u" alt="" class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                    <span
                      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 font-mono text-[10px] text-white/90"
                    >
                      #{{ i + 1 }}
                    </span>
                  </a>
                  <a
                    v-else
                    :href="u"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex min-h-[5.5rem] flex-col justify-center rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-center font-mono text-[11px] text-cyan-200/95 transition hover:border-cyan-500/35 hover:bg-cyan-500/10"
                  >
                    <span class="text-slate-500">Материал {{ i + 1 }}</span>
                    <span class="mt-1 truncate text-cyan-300/90">{{ u }}</span>
                  </a>
                </template>
              </div>
            </div>

            <p class="mt-8 font-mono text-[10px] uppercase tracking-widest text-cyan-500/75">участники</p>
            <h3 class="mt-1 text-lg font-semibold text-slate-100">Кто в проекте</h3>
            <ul class="mt-4 grid gap-3 sm:grid-cols-2">
              <li
                v-for="m in summary.members"
                :key="m.user_id"
                class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3.5 transition hover:border-cyan-500/25"
              >
                <span class="truncate font-medium text-slate-100">@{{ m.username }}</span>
                <span
                  class="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
                  :class="
                    m.role === 'captain'
                      ? 'border border-amber-400/45 bg-amber-500/15 text-amber-200'
                      : 'border border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
                  "
                >
                  {{ m.role === 'captain' ? 'капитан' : 'участник' }}
                </span>
              </li>
            </ul>

            <div v-if="isCaptain" class="mt-8 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/25 to-slate-950/40 p-5 sm:p-6">
              <h3 class="font-mono text-sm font-medium text-amber-100/95">Материалы для жюри</h3>
              <p class="mt-1 text-xs text-slate-500">Видят организаторы и эксперты при оценке.</p>

              <label class="mb-1.5 mt-5 block font-mono text-[10px] uppercase tracking-wider text-slate-500"
                >описание проекта</label
              >
              <textarea
                v-model="briefDesc"
                class="textarea textarea-bordered mb-4 w-full border-white/10 bg-black/35 text-sm text-slate-100 placeholder:text-slate-600"
                rows="4"
                placeholder="Кратко: что делаете, стек, демо…"
              />

              <label class="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500"
                >ссылка на репозиторий</label
              >
              <input
                v-model="briefRepo"
                type="url"
                class="input input-bordered mb-4 w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100"
                placeholder="https://github.com/org/repo"
              />

              <label class="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500"
                >ссылка на решение (http/https)</label
              >
              <input
                v-model="briefSolution"
                type="url"
                class="input input-bordered mb-1 w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100"
                placeholder="https://…"
                :disabled="!submissionOpen"
              />
              <p v-if="!submissionOpen" class="mb-4 font-mono text-[10px] text-amber-400/90">
                Таймер истёк — ссылку на решение менять нельзя.
              </p>
              <p v-else class="mb-4 font-mono text-[10px] text-slate-600">Видна всем на публичной карточке команды.</p>

              <label class="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500"
                >скриншоты — URL по одному в строке</label
              >
              <textarea
                v-model="briefShots"
                class="textarea textarea-bordered mb-4 w-full border-white/10 bg-black/35 font-mono text-xs text-slate-200"
                rows="3"
                placeholder="https://…/shot1.png"
              />

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  class="btn border-0 bg-gradient-to-r from-amber-600 to-orange-600 font-mono text-sm text-white hover:opacity-95 disabled:opacity-40"
                  :disabled="busy"
                  @click="saveBrief"
                >
                  Сохранить материалы
                </button>
                <div class="flex flex-1 flex-col gap-1 sm:max-w-xs">
                  <span class="font-mono text-[10px] uppercase tracking-wider text-slate-500">фото команды</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2 file:py-1 file:font-mono"
                    :disabled="busy"
                    @change="onPhotoChange"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-if="photoMsg" class="mt-4 text-center font-mono text-xs text-slate-500">{{ photoMsg }}</p>
      </template>

      <div v-else class="flex justify-center py-24">
        <span class="loading loading-spinner loading-lg text-cyan-500" />
      </div>
    </template>
  </div>
</template>
