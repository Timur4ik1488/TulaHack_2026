<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/leaderboard'
    await router.replace(redirect)
  } catch {
    error.value = '401 Unauthorized — проверь email и пароль'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col items-center pt-10">
    <p class="mb-2 font-mono text-xs text-cyan-500/80">// remote: authenticate</p>
    <h1 class="mb-2 text-center text-3xl font-bold tracking-tight text-slate-100">
      Вход в <span class="text-cyan-400">Hack</span><span class="text-emerald-400">Swipe</span>
    </h1>
    <p class="mb-8 text-center text-sm text-slate-500">Жюри, участники и админы — одна форма.</p>

    <form
      class="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm"
      @submit.prevent="submit"
    >
      <div class="space-y-5">
        <label class="block">
          <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">email</span>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
            autocomplete="username"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">password</span>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
            autocomplete="current-password"
          />
        </label>
        <p v-if="error" class="font-mono text-sm text-rose-400">{{ error }}</p>
        <button
          type="submit"
          class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 py-3.5 font-mono text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 disabled:opacity-50"
          :disabled="busy"
        >
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          <span v-else>$ authenticate</span>
        </button>
        <p class="pt-2 text-center font-mono text-xs text-slate-500">
          Нет аккаунта?
          <RouterLink to="/register" class="text-cyan-400 underline-offset-2 hover:underline">register --team</RouterLink>
        </p>
      </div>
    </form>
  </div>
</template>
