<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

interface CaseRow {
  id: number
  ordinal: number
  title: string
  description: string | null
  company_name: string
}

const rows = ref<CaseRow[]>([])
const err = ref('')

onMounted(async () => {
  await auth.fetchMe()
  try {
    const { data } = await api.get<CaseRow[]>('/api/cases/')
    rows.value = data
  } catch {
    err.value = 'Не удалось загрузить кейсы'
  }
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-8 text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">// кейсы хакатона</p>
      <h1 class="text-3xl font-bold tracking-tight text-slate-100">Кейсы</h1>
      <p class="mt-2 text-sm text-slate-500">Номер, название, компания — у каждого кейса своя страница со списком команд.</p>
    </div>
    <p v-if="err" class="mb-4 text-center font-mono text-sm text-rose-400">{{ err }}</p>

    <RouterLink
      v-if="auth.role === 'admin'"
      to="/admin/cases"
      class="mb-6 flex flex-col gap-1 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/50 to-slate-900/60 px-5 py-4 shadow-lg transition hover:border-amber-400/50"
    >
      <span class="font-mono text-[10px] uppercase tracking-widest text-amber-300/90">admin</span>
      <span class="text-lg font-semibold text-amber-50">Создать кейс</span>
      <span class="text-sm text-amber-200/70">Название, компания, описание — порядковый номер присвоится автоматически.</span>
      <span class="mt-2 font-mono text-xs text-amber-400/90">Перейти в форму создания →</span>
    </RouterLink>

    <ul v-if="!err" class="space-y-3">
      <li
        v-for="c in rows"
        :key="c.id"
        class="rounded-2xl border border-white/10 bg-slate-900/50 px-5 py-4 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/25"
      >
        <RouterLink :to="`/cases/${c.id}`" class="block">
          <p class="font-mono text-[10px] uppercase tracking-widest text-amber-400/90">
            кейс №{{ c.ordinal }} · {{ c.company_name }}
          </p>
          <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ c.title }}</h2>
          <p v-if="c.description" class="mt-2 line-clamp-2 text-sm text-slate-500">{{ c.description }}</p>
          <p class="mt-3 font-mono text-xs text-cyan-400/90">Подробнее →</p>
        </RouterLink>
      </li>
    </ul>
    <p v-if="!err && !rows.length" class="text-center font-mono text-sm text-slate-600">Кейсы пока не добавлены.</p>
  </div>
</template>
