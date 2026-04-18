<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/http'

const tgBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HackSwipeBot'

interface TeamRow {
  id: number
  name: string
  description: string | null
  case_number: number | null
}

interface CriterionRow {
  id: number
  name: string
  weight: number
  max_score: number
}

const teams = ref<TeamRow[]>([])
const criteria = ref<CriterionRow[]>([])
const err = ref('')

async function load() {
  err.value = ''
  try {
    const [t, c] = await Promise.all([api.get<TeamRow[]>('/api/teams/'), api.get<CriterionRow[]>('/api/criteria/')])
    teams.value = [...t.data].sort((a, b) => a.id - b.id)
    criteria.value = c.data
  } catch {
    err.value = 'Не удалось загрузить данные'
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 px-1 sm:px-0">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-amber-400/90">admin · Telegram</p>
      <h1 class="text-3xl font-bold text-slate-100">Консоль под бота</h1>
      <p class="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        Быстрый обзор команд и критериев с сайта. Рассылки о таймере — через кнопку «TG уведомления» (привязка аккаунта).
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <a
          :href="`https://t.me/${tgBotUsername}`"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-full border border-sky-500/35 bg-sky-500/10 px-4 py-2 font-mono text-xs text-sky-200 hover:bg-sky-500/20"
        >
          Открыть @{{ tgBotUsername }} ↗
        </a>
        <RouterLink
          to="/admin"
          class="rounded-full border border-white/15 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-white/5"
        >
          ← Панель
        </RouterLink>
      </div>
    </div>

    <section class="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5">
      <h2 class="font-mono text-sm text-amber-100">ADMIN_CHAT_ID</h2>
      <p class="mt-2 text-sm text-slate-400">
        Это ваш числовой <strong class="text-slate-300">chat_id</strong> в личке с ботом (не username). Узнать можно у
        ботов вроде <span class="font-mono text-cyan-300">@userinfobot</span> или
        <span class="font-mono text-cyan-300">@getidsbot</span> — они ответят числом. Подставьте в
        <span class="font-mono text-slate-200">ADMIN_CHAT_ID</span> / <span class="font-mono text-slate-200">TELEGRAM_ADMIN_CHAT_ID</span>
        в <span class="font-mono">.env</span>, чтобы дублировать служебные сообщения админу (если бот не привязан к сайту как подписчик).
      </p>
    </section>

    <p v-if="err" class="text-center font-mono text-sm text-rose-400">{{ err }}</p>

    <section>
      <h2 class="mb-4 font-mono text-xs uppercase tracking-wider text-cyan-500/80">Команды по порядку id</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <article
          v-for="t in teams"
          :key="t.id"
          class="rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-lg backdrop-blur-sm"
        >
          <p class="font-mono text-[10px] text-slate-500">#{{ t.id }}</p>
          <h3 class="mt-1 font-semibold text-slate-100">{{ t.name }}</h3>
          <p v-if="t.case_number != null" class="mt-1 font-mono text-xs text-amber-300/90">case №{{ t.case_number }}</p>
          <p v-if="t.description" class="mt-2 line-clamp-4 text-xs text-slate-500">{{ t.description }}</p>
          <RouterLink :to="`/teams/${t.id}`" class="mt-3 inline-block font-mono text-xs text-cyan-400 hover:underline">
            Публичная карточка →
          </RouterLink>
        </article>
      </div>
    </section>

    <section>
      <h2 class="mb-4 font-mono text-xs uppercase tracking-wider text-violet-400/80">Критерии жюри</h2>
      <ul class="space-y-2">
        <li
          v-for="cr in criteria"
          :key="cr.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 font-mono text-sm"
        >
          <span class="text-slate-200">{{ cr.name }}</span>
          <span class="text-slate-500">вес {{ cr.weight }}% · max {{ cr.max_score }}</span>
        </li>
      </ul>
      <RouterLink to="/admin/criteria" class="mt-4 inline-block font-mono text-xs text-amber-300 hover:underline">
        Редактировать критерии в админке →
      </RouterLink>
    </section>
  </div>
</template>
