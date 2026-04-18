<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'
import { apiErrorMessage } from '../utils/apiErrorMessage'

interface Team {
  id: number
  name: string
  members: string
  contact: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

const teams = ref<Team[]>([])
const form = reactive({
  name: '',
  members: '',
  contact: '',
  description: '',
  case_number: '' as string | number,
  photo_url: '',
})
const busy = ref(false)
const formMsg = ref('')

async function load() {
  const { data } = await api.get<Team[]>('/api/teams/')
  teams.value = data
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
      case_number: form.case_number === '' ? null : Number(form.case_number),
      photo_url: form.photo_url || null,
    })
    form.name = ''
    form.members = ''
    form.contact = ''
    form.description = ''
    form.case_number = ''
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
        Создание команды в том же визуальном ключе, что и остальной HackSwipe: тёмные панели, неоновые акценты, без «чужого» light-card.
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
        <p class="mt-1 text-xs text-slate-500">POST /api/teams/ — после сохранения появится инвайт у капитана при регистрации.</p>
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
        <label class="block">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">номер кейса</span>
          <input
            v-model="form.case_number"
            type="number"
            class="input w-full border-white/10 bg-black/40 font-mono text-slate-100"
            placeholder="—"
          />
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
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="t in teams"
          :key="t.id"
          class="flex overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg transition hover:border-cyan-500/25"
        >
          <div class="relative w-24 shrink-0">
            <img
              :src="teamPhotoSrc(t.photo_url)"
              :alt="t.name"
              class="h-full min-h-[112px] w-full object-cover"
              @error="onTeamPhotoError"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col justify-between p-4">
            <div>
              <p class="font-mono text-[10px] text-slate-600">#{{ t.id }}</p>
              <h3 class="truncate font-semibold text-slate-100">{{ t.name }}</h3>
              <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ t.contact }}</p>
            </div>
            <button
              type="button"
              class="mt-3 self-start rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-300 transition hover:bg-rose-500/20"
              @click="remove(t.id)"
            >
              удалить
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
