<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

interface LinkItem {
  to: string
  label: string
}

const logoTo = computed(() => (auth.role === 'admin' ? '/admin' : '/'))

const navMain = computed((): LinkItem[] => [
  { to: '/leaderboard', label: 'Лидерборд' },
  { to: '/podium', label: 'Подиум' },
  { to: '/timer', label: 'Таймер' },
])

const navGuest = computed((): LinkItem[] =>
  auth.user ? [] : [
    { to: '/login', label: 'sign in' },
    { to: '/register', label: 'register' },
  ],
)

const showSympathy = computed(
  () => !!auth.user && ['participant', 'admin', 'expert'].includes(auth.role || ''),
)

const showJuryDeck = computed(() => auth.role === 'expert')

const teamMenu = computed((): LinkItem[] => {
  if (!auth.user || !['participant', 'admin', 'expert'].includes(auth.role || '')) {
    return []
  }
  const r = auth.role
  return [
    { to: '/team/profile', label: r === 'participant' ? 'Моя команда' : 'Профиль' },
    { to: '/team/breakdown', label: 'Разбор баллов' },
    { to: '/team/chat', label: 'Чат команды' },
  ]
})

const adminMenu = computed((): LinkItem[] => {
  if (auth.role !== 'admin') return []
  return [
    { to: '/admin', label: 'Панель' },
    { to: '/admin/teams', label: 'Команды' },
    { to: '/admin/criteria', label: 'Критерии' },
    { to: '/admin/users', label: 'Пользователи' },
  ]
})

function closeDetails(ev: MouseEvent) {
  const el = (ev.currentTarget as HTMLElement | null)?.closest('details')
  if (el) {
    el.removeAttribute('open')
  }
}

async function onLogout() {
  await auth.logout()
}
</script>

<template>
  <div data-theme="dark" class="hs-grid-bg min-h-screen">
    <header
      class="sticky top-0 z-50 border-b border-cyan-500/10 bg-slate-950/90 backdrop-blur-md"
    >
      <div
        class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:px-4 md:px-5"
        style="
          padding-left: max(0.75rem, env(safe-area-inset-left));
          padding-right: max(0.75rem, env(safe-area-inset-right));
        "
      >
        <RouterLink
          :to="logoTo"
          class="group flex shrink-0 items-center gap-2 font-mono text-base font-bold tracking-tight text-slate-100 sm:text-lg"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition group-hover:shadow-cyan-400/40 sm:h-9 sm:w-9"
            >&lt;/&gt;</span
          >
          <span class="truncate">
            <span class="text-cyan-400">Hack</span><span class="text-emerald-400">Swipe</span>
          </span>
        </RouterLink>

        <nav
          class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-1.5"
        >
          <RouterLink
            v-if="auth.role === 'admin'"
            to="/jury/teams"
            class="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-300/40 transition hover:brightness-110 sm:px-3.5 sm:text-xs"
            active-class="!ring-amber-200 !brightness-110"
          >
            Оценка жюри
          </RouterLink>

          <RouterLink
            v-if="showJuryDeck"
            to="/jury/teams"
            class="shrink-0 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/35 hover:text-cyan-200 sm:px-3 sm:text-xs"
            active-class="!border-cyan-500/40 !bg-cyan-500/10 !text-cyan-200"
          >
            Команды для оценки
          </RouterLink>

          <RouterLink
            v-for="l in navMain"
            :key="l.to"
            :to="l.to"
            class="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs"
            active-class="!bg-cyan-500/15 !text-cyan-300 ring-1 ring-cyan-500/30"
          >
            {{ l.label }}
          </RouterLink>

          <template v-for="l in navGuest" :key="l.to">
            <RouterLink
              :to="l.to"
              class="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] text-slate-400 hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs"
            >
              {{ l.label }}
            </RouterLink>
          </template>

          <RouterLink
            v-if="showSympathy"
            to="/sympathy"
            class="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-violet-300/90 ring-1 ring-violet-500/25 transition hover:bg-violet-500/10 sm:px-3 sm:text-xs"
            active-class="!bg-violet-500/20 !ring-violet-400/50"
          >
            Симпатии
          </RouterLink>

          <details v-if="teamMenu.length" class="nav-details group relative">
            <summary
              class="flex cursor-pointer list-none items-center gap-0.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-white/20 hover:text-slate-100 sm:px-3 sm:text-xs"
            >
              Команда
              <span class="text-[9px] text-slate-500 transition group-open:rotate-180">▼</span>
            </summary>
            <div
              class="absolute right-0 top-[calc(100%+0.35rem)] z-[100] min-w-[11.5rem] rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-xl ring-1 ring-black/40 backdrop-blur-md"
            >
              <RouterLink
                v-for="t in teamMenu"
                :key="t.to"
                :to="t.to"
                class="block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-white/5 hover:text-cyan-200"
                active-class="!bg-cyan-500/10 !text-cyan-200"
                @click="closeDetails"
              >
                {{ t.label }}
              </RouterLink>
            </div>
          </details>

          <details v-if="adminMenu.length" class="nav-details group relative">
            <summary
              class="flex cursor-pointer list-none items-center gap-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-200/90 hover:border-amber-400/40 sm:px-3 sm:text-xs"
            >
              admin
              <span class="text-[9px] text-amber-400/70 transition group-open:rotate-180">▼</span>
            </summary>
            <div
              class="absolute right-0 top-[calc(100%+0.35rem)] z-[100] min-w-[11.5rem] rounded-xl border border-amber-500/20 bg-slate-950/95 py-1 shadow-xl ring-1 ring-black/40 backdrop-blur-md"
            >
              <RouterLink
                v-for="a in adminMenu"
                :key="a.to"
                :to="a.to"
                class="block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-amber-500/10 hover:text-amber-100"
                active-class="!bg-amber-500/15 !text-amber-100"
                @click="closeDetails"
              >
                {{ a.label }}
              </RouterLink>
            </div>
          </details>

          <button
            v-if="auth.user"
            type="button"
            class="shrink-0 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-mono text-[11px] text-rose-300/90 hover:bg-rose-500/20 sm:text-xs"
            :title="`sign out (${auth.user.username})`"
            @click="onLogout"
          >
            <span class="hidden sm:inline">sign out — </span>@{{ auth.user.username }}
          </button>
        </nav>
      </div>
    </header>

    <main
      class="mx-auto max-w-7xl px-3 py-8 pb-20 sm:px-5 sm:py-10 md:px-6"
      style="
        padding-bottom: max(5rem, env(safe-area-inset-bottom));
        padding-left: max(0.75rem, env(safe-area-inset-left));
        padding-right: max(0.75rem, env(safe-area-inset-right));
      "
    >
      <RouterView />
    </main>

    <footer class="border-t border-white/5 py-6 text-center font-mono text-[10px] text-slate-600">
      Хакатон: команды, жюри, зрители · PostgreSQL · обновление рейтинга по WebSocket
    </footer>
  </div>
</template>

<style scoped>
.nav-details > summary {
  list-style: none;
}
.nav-details > summary::-webkit-details-marker {
  display: none;
}
</style>
