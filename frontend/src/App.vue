<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

const links = computed(() => {
  const base: { to: string; label: string }[] = [
    { to: '/leaderboard', label: 'Лидерборд' },
    { to: '/podium', label: 'Топ-3' },
  ]
  if (!auth.user) {
    base.push({ to: '/login', label: 'git login' }, { to: '/register', label: 'register' })
    return base
  }
  const r = auth.role
  if (r === 'admin' || r === 'expert') {
    base.push(
      { to: '/jury/swipe', label: 'Свайп' },
      { to: '/jury/teams', label: 'Команды' },
    )
  }
  if (r === 'participant' || r === 'admin') {
    base.push(
      { to: '/team/profile', label: 'Профиль' },
      { to: '/team/breakdown', label: 'Diff оценок' },
      { to: '/team/chat', label: 'Чат' },
    )
  }
  if (r === 'admin') {
    base.push(
      { to: '/admin/teams', label: 'Админ: teams' },
      { to: '/admin/criteria', label: 'Критерии' },
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/timer', label: 'Таймер' },
    )
  }
  return base
})

async function onLogout() {
  await auth.logout()
}
</script>

<template>
  <div data-theme="dark" class="hs-grid-bg min-h-screen">
    <header
      class="sticky top-0 z-50 border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <RouterLink
          to="/"
          class="group flex items-center gap-2 font-mono text-lg font-bold tracking-tight text-slate-100"
        >
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition group-hover:shadow-cyan-400/40"
            >&lt;/&gt;</span
          >
          <span>
            <span class="text-cyan-400">Hack</span><span class="text-emerald-400">Swipe</span>
          </span>
        </RouterLink>
        <nav class="flex flex-wrap items-center gap-1">
          <RouterLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="rounded-full px-3 py-1.5 font-mono text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-cyan-300"
            active-class="!bg-cyan-500/15 !text-cyan-300 ring-1 ring-cyan-500/30"
          >
            {{ l.label }}
          </RouterLink>
          <button
            v-if="auth.user"
            type="button"
            class="ml-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs text-rose-300 transition hover:bg-rose-500/20"
            @click="onLogout"
          >
            logout @{{ auth.user.username }}
          </button>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8 pb-16">
      <RouterView />
    </main>

    <footer class="border-t border-white/5 py-6 text-center font-mono text-[10px] text-slate-600">
      // Tinder, но для репозиториев команд · PostgreSQL · Socket.IO live score
    </footer>
  </div>
</template>
