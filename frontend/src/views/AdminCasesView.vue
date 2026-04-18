<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { apiErrorMessage } from '../utils/apiErrorMessage'

interface CaseRow {
  id: number
  ordinal: number
  title: string
  company_name: string
}

const rows = ref<CaseRow[]>([])
const err = ref('')
const busy = ref(false)
const title = ref('')
const company = ref('')
const description = ref('')
const msg = ref('')

async function load() {
  err.value = ''
  try {
    const { data } = await api.get<CaseRow[]>('/api/cases/')
    rows.value = data
  } catch {
    err.value = 'Не удалось загрузить кейсы'
  }
}

async function createCase() {
  busy.value = true
  msg.value = ''
  try {
    const { data } = await api.post<CaseRow>('/api/cases/', {
      title: title.value.trim(),
      company_name: company.value.trim(),
      description: description.value.trim() || null,
    })
    title.value = ''
    company.value = ''
    description.value = ''
    msg.value = `Кейс «${data.title}» создан`
    await load()
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Ошибка создания')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="mb-2 text-center font-mono text-xs text-amber-400/90">admin · кейсы</p>
    <h1 class="mb-8 text-center text-3xl font-bold text-slate-100">Кейсы</h1>

    <div class="mb-10 rounded-2xl border border-amber-500/25 bg-slate-900/50 p-6 shadow-xl">
      <h2 class="font-mono text-sm text-amber-100">Новый кейс</h2>
      <p class="mt-1 text-xs text-slate-500">Порядковый номер присваивается автоматически.</p>
      <label class="mt-4 block font-mono text-[10px] uppercase text-slate-500">название</label>
      <input
        v-model="title"
        type="text"
        class="input input-bordered mt-1 w-full border-white/10 bg-black/40 text-slate-100"
        placeholder="Название кейса"
      />
      <label class="mt-3 block font-mono text-[10px] uppercase text-slate-500">компания</label>
      <input
        v-model="company"
        type="text"
        class="input input-bordered mt-1 w-full border-white/10 bg-black/40 text-slate-100"
        placeholder="Компания — заказчик кейса"
      />
      <label class="mt-3 block font-mono text-[10px] uppercase text-slate-500">описание</label>
      <textarea
        v-model="description"
        rows="3"
        class="textarea textarea-bordered mt-1 w-full border-white/10 bg-black/40 text-slate-100"
        placeholder="Описание задачи"
      />
      <button
        type="button"
        class="btn mt-4 w-full border-0 bg-gradient-to-r from-amber-600 to-orange-600 font-mono text-white sm:w-auto"
        :disabled="busy || !title.trim() || !company.trim()"
        @click="createCase"
      >
        Создать кейс
      </button>
      <p v-if="msg" class="mt-3 font-mono text-xs text-slate-400">{{ msg }}</p>
    </div>

    <p v-if="err" class="text-center font-mono text-sm text-rose-400">{{ err }}</p>
    <ul v-else class="space-y-2">
      <li
        v-for="c in rows"
        :key="c.id"
        class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3"
      >
        <span class="font-mono text-xs text-amber-300/90">#{{ c.ordinal }}</span>
        <span class="mx-3 min-w-0 flex-1 truncate text-slate-200">{{ c.title }}</span>
        <RouterLink
          :to="`/cases/${c.id}`"
          class="shrink-0 rounded-lg border border-cyan-500/30 px-3 py-1 font-mono text-xs text-cyan-200 hover:bg-cyan-500/10"
        >
          открыть
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
