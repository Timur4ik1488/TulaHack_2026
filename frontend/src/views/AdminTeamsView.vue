<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'
import { apiErrorMessage } from '../utils/apiErrorMessage'

interface TeamCaseCardBrief {
  case_id: number
  ordinal: number
  title: string
  company_name: string
  description: string | null
}

interface TeamMemberBrief {
  username: string
  role: string
}

interface Team {
  id: number
  name: string
  contact?: string
  description: string | null
  case_number: number | null
  case_ordinal?: number | null
  case_card?: TeamCaseCardBrief | null
  /** Состав с API (`/api/teams/`, поле `members`) — аккаунты, не текстовое поле формы. */
  members?: TeamMemberBrief[]
  photo_url: string | null
  repo_url?: string | null
  solution_submission_url?: string | null
  screenshots_json?: string | null
}

interface CaseRow {
  id: number
  ordinal: number
  title: string
  description: string | null
  company_name: string
}

const teams = ref<Team[]>([])
const cases = ref<CaseRow[]>([])
const form = reactive({
  name: '',
  members: '',
  contact: '',
  description: '',
  /** '' — без кейса; иначе ordinal кейса (строка для select). */
  caseOrdinal: '' as string,
  photo_url: '',
})
const busy = ref(false)
const formMsg = ref('')

const casesSorted = computed(() => [...cases.value].sort((a, b) => a.ordinal - b.ordinal))

function caseForTeam(t: Team): CaseRow | null {
  if (t.case_card) {
    const k = t.case_card
    return {
      id: k.case_id,
      ordinal: k.ordinal,
      title: k.title,
      description: k.description,
      company_name: k.company_name,
    }
  }
  const ord = t.case_ordinal
  if (ord != null) {
    const hit = cases.value.find((c) => c.ordinal === ord)
    if (hit) return hit
  }
  if (t.case_number == null) return null
  const n = t.case_number
  return cases.value.find((c) => c.ordinal === n || c.id === n) ?? null
}

/** Номер кейса для бейджа: только если кейс реально найден. */
function displayCaseOrdinal(t: Team): number | null {
  return t.case_card?.ordinal ?? t.case_ordinal ?? null
}

async function load() {
  const [tr, cr] = await Promise.all([
    api.get<Team[]>('/api/teams/'),
    api.get<CaseRow[]>('/api/cases/'),
  ])
  teams.value = tr.data
  cases.value = cr.data
}

async function createTeam() {
  busy.value = true
  formMsg.value = ''
  try {
    await api.post('/api/teams/', {
      name: form.name,
      members: form.members,
      contact: form.contact,
      description: form.description || null,
      case_number: form.caseOrdinal === '' ? null : Number(form.caseOrdinal),
      photo_url: form.photo_url || null,
    })
    form.name = ''
    form.members = ''
    form.contact = ''
    form.description = ''
    form.caseOrdinal = ''
    form.photo_url = ''
    formMsg.value = 'Команда создана'
    await load()
  } catch (e) {
    formMsg.value = apiErrorMessage(e, 'Не удалось создать команду')
  } finally {
    busy.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Удалить команду?')) return
  try {
    await api.delete(`/api/teams/${id}`)
    await load()
  } catch (e) {
    formMsg.value = apiErrorMessage(e, 'Не удалось удалить')
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-amber-400/80">admin · команды</p>
      <h1
        class="bg-gradient-to-r from-amber-200 via-rose-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl"
      >
        Команды
      </h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-slate-500">
        Новая команда появляется в общем стеке: карточка, инвайт капитану, кейс из списка — без ручных «номеров из
        головы».
      </p>
    </div>

    <p v-if="formMsg" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center font-mono text-sm text-slate-300">
      {{ formMsg }}
    </p>

    <section
      class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-merge"
    >
      <div
        class="border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-cyan-500/15 px-6 py-4"
      >
        <h2 class="font-mono text-sm font-semibold uppercase tracking-widest text-slate-200">Новая команда</h2>
        <p class="mt-1 text-xs text-slate-500">
          После «создать» у капитана при регистрации появится инвайт — кидай ссылку в чат, не объясняя SQL.
        </p>
      </div>
      <div class="grid gap-4 p-6 md:grid-cols-2">
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">название</span>
          <input
            v-model="form.name"
            class="input w-full border-white/10 bg-black/40 font-sans text-slate-100 placeholder:text-slate-600 focus:border-amber-500/40"
            placeholder="Название команды"
          />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">контакт</span>
          <input
            v-model="form.contact"
            class="input w-full border-white/10 bg-black/40 font-sans text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/40"
            placeholder="Telegram / email капитана"
          />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">состав (текстом)</span>
          <textarea
            v-model="form.members"
            class="textarea min-h-[88px] w-full border-white/10 bg-black/40 font-sans text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500/35"
            placeholder="Состав одной строкой или списком"
          />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">описание</span>
          <textarea
            v-model="form.description"
            class="textarea min-h-[72px] w-full border-white/10 bg-black/40 font-sans text-sm text-slate-100 placeholder:text-slate-600"
            placeholder="Кратко о проекте (опционально)"
          />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">кейс</span>
          <select
            v-model="form.caseOrdinal"
            class="hs-select input w-full min-h-[3rem] border-white/15 bg-slate-900/95 py-2.5 pr-10 font-mono text-sm leading-normal text-slate-100 focus:border-amber-500/40"
          >
            <option value="">Без кейса</option>
            <option v-for="c in casesSorted" :key="c.id" :value="String(c.ordinal)">
              {{ c.title }} — {{ c.company_name }}
            </option>
          </select>
          <span v-if="!casesSorted.length" class="mt-1 block text-xs text-amber-200/80">
            Кейсов ещё нет — сначала заведи треки в админке «Кейсы», потом вернись сюда и привяжи команду.
          </span>
        </label>
        <label class="block">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">URL фото</span>
          <input
            v-model="form.photo_url"
            class="input w-full border-white/10 bg-black/40 font-mono text-xs text-cyan-100/90 placeholder:text-slate-600"
            placeholder="https://… или пусто — дефолтный лев"
          />
        </label>
        <div class="flex items-end md:col-span-2">
          <button
            type="button"
            class="btn w-full border-0 bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-600 font-mono text-sm font-semibold text-white shadow-lg hover:opacity-95 disabled:opacity-40"
            :disabled="busy || !form.name.trim() || !form.contact.trim()"
            @click="createTeam"
          >
            создать команду
          </button>
        </div>
      </div>
    </section>

    <section>
      <h2 class="mb-4 font-mono text-xs uppercase tracking-widest text-slate-500">все команды ({{ teams.length }})</h2>
      <div class="space-y-6">
        <article
          v-for="t in teams"
          :key="t.id"
          class="grid gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/35 shadow-lg lg:grid-cols-2"
        >
          <div class="flex min-w-0">
            <div class="relative w-28 shrink-0 sm:w-32">
              <img
                :src="teamPhotoSrc(t.photo_url)"
                :alt="t.name"
                class="h-full min-h-[140px] w-full object-cover"
                @error="onTeamPhotoError"
              />
              <div class="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col justify-between p-4">
              <div class="min-w-0">
                <p class="font-mono text-[10px] text-slate-600">#{{ t.id }}</p>
                <h3 class="truncate text-lg font-semibold text-slate-100">{{ t.name }}</h3>
                <p v-if="displayCaseOrdinal(t) != null" class="mt-1 font-mono text-xs text-amber-200/90">
                  кейс №{{ displayCaseOrdinal(t) }}
                </p>
                <p class="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">
                  {{ t.description || '— без описания —' }}
                </p>
                <p class="mt-2 truncate font-mono text-[10px] text-slate-500">контакт: {{ t.contact ?? '—' }}</p>
                <a
                  v-if="t.repo_url"
                  :href="t.repo_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 inline-block max-w-full truncate font-mono text-[10px] text-cyan-400/90 underline-offset-2 hover:text-cyan-300"
                >
                  репозиторий →
                </a>
              </div>
              <button
                type="button"
                class="mt-3 self-start rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-300 transition hover:bg-rose-500/20"
                @click="remove(t.id)"
              >
                удалить команду
              </button>
            </div>
          </div>

          <div
            class="flex min-w-0 flex-col justify-between border-t border-white/5 p-4 lg:border-l lg:border-t-0 lg:pl-5"
          >
            <div>
              <p class="font-mono text-[10px] uppercase tracking-wider text-violet-400/90">кейс хакатона</p>
              <template v-if="caseForTeam(t)">
                <h4 class="mt-1 font-semibold text-slate-100">{{ caseForTeam(t)!.title }}</h4>
                <p class="mt-0.5 font-mono text-[10px] text-slate-500">{{ caseForTeam(t)!.company_name }}</p>
                <p class="mt-2 line-clamp-4 text-xs text-slate-400">
                  {{ caseForTeam(t)!.description || '—' }}
                </p>
              </template>
              <p v-else class="mt-2 text-sm text-slate-500">Кейс не привязан (номер кейса не задан или не найден в списке кейсов).</p>

              <p class="mt-4 font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">ссылка на решение</p>
              <a
                v-if="t.solution_submission_url"
                :href="t.solution_submission_url"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 break-all font-mono text-xs text-emerald-300/95 underline-offset-2 hover:text-emerald-200"
              >
                {{ t.solution_submission_url }}
              </a>
              <p v-else class="mt-1 text-xs text-slate-500">Команда ещё не указала ссылку на решение (видно капитану в профиле).</p>
            </div>
            <RouterLink
              class="mt-4 inline-flex w-fit items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] text-cyan-200 hover:bg-cyan-500/20"
              :to="`/teams/${t.id}`"
            >
              публичная карточка →
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
