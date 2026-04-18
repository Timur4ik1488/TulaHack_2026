<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const zipBusy = ref(false)
const zipErr = ref('')

function parseFilenameFromDisposition(cd: string | null): string | null {
  if (!cd) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd)
  return m ? decodeURIComponent(m[1].replace(/"/g, '')) : null
}

async function downloadJuryPack() {
  zipErr.value = ''
  zipBusy.value = true
  try {
    const base = import.meta.env.VITE_API_URL ?? ''
    const r = await fetch(`${base}/api/scores/jury-pack.zip`, { credentials: 'include' })
    if (!r.ok) {
      zipErr.value = 'Не удалось скачать архив.'
      return
    }
    const blob = await r.blob()
    const name = parseFilenameFromDisposition(r.headers.get('content-disposition')) ?? 'jury_pack.zip'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    zipErr.value = 'Ошибка сети при скачивании ZIP.'
  } finally {
    zipBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <p class="mb-2 text-center font-mono text-xs text-amber-400/90">admin · панель</p>
    <h1 class="mb-2 text-center text-3xl font-bold text-slate-100">Панель администратора</h1>
    <p class="mb-10 text-center text-sm text-slate-500">
      Официальная оценка жюри — лента команд и форма по критериям. Зрительские симпатии —
      <RouterLink to="/sympathy" class="text-violet-300 underline-offset-2 hover:underline">симпатии зрителей</RouterLink>.
    </p>

    <RouterLink
      to="/jury/teams"
      class="mb-8 flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/25 via-rose-500/20 to-fuchsia-500/25 px-8 py-10 text-center shadow-[0_0_40px_-10px_rgba(251,191,36,0.45)] transition hover:border-amber-300/70 hover:shadow-[0_0_48px_-8px_rgba(251,191,36,0.55)]"
    >
      <span class="text-lg font-semibold tracking-tight text-white md:text-xl">Оценка жюри</span>
      <span class="font-mono text-xs uppercase tracking-[0.2em] text-amber-200/80">основной поток</span>
      <span class="mt-1 max-w-sm text-sm text-amber-100/85">
        Лента команд → форма по каждому критерию, черновики и финализация
      </span>
    </RouterLink>

    <div class="mb-8 flex flex-col items-center gap-2">
      <button
        type="button"
        class="btn btn-outline border-emerald-500/35 font-mono text-xs text-emerald-200 hover:bg-emerald-500/10"
        :disabled="zipBusy"
        @click="downloadJuryPack"
      >
        {{ zipBusy ? '…' : 'Пакет жюри: ZIP (Excel по каждому кейсу)' }}
      </button>
      <p v-if="zipErr" class="font-mono text-xs text-rose-400">{{ zipErr }}</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        to="/admin/teams"
        class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 text-center transition hover:border-cyan-500/40"
      >
        <span class="text-sm font-medium text-slate-100">Команды</span>
      </RouterLink>
      <RouterLink
        to="/admin/criteria"
        class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 text-center transition hover:border-cyan-500/40"
      >
        <span class="text-sm font-medium text-slate-100">Критерии</span>
      </RouterLink>
      <RouterLink
        to="/admin/users"
        class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 text-center transition hover:border-cyan-500/40"
      >
        <span class="text-sm font-medium text-slate-100">Пользователи</span>
      </RouterLink>
      <RouterLink
        to="/admin/cases"
        class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 text-center transition hover:border-cyan-500/40"
      >
        <span class="text-sm font-medium text-slate-100">Кейсы</span>
      </RouterLink>
      <RouterLink
        to="/timer"
        class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 text-center transition hover:border-emerald-500/40"
      >
        <span class="text-sm font-medium text-slate-100">Таймер</span>
      </RouterLink>
    </div>
  </div>
</template>
