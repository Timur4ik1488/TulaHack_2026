<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const mode = ref<'create' | 'join'>('create')
const email = ref('')
const username = ref('')
const password = ref('')
const inviteCode = ref('')
const teamName = ref('')
const contact = ref('')
const description = ref('')
const repoUrl = ref('')
const rosterLine = ref('')
const error = ref('')
const busy = ref(false)

const auth = useAuthStore()
const router = useRouter()

const title = computed(() => (mode.value === 'create' ? 'Создать команду' : 'Войти по инвайту'))

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'create') {
      await auth.register({
        email: email.value,
        username: username.value,
        password: password.value,
        new_team: {
          name: teamName.value,
          contact: contact.value,
          description: description.value || null,
          repo_url: repoUrl.value || null,
          roster_line: rosterLine.value || null,
        },
      })
    } else {
      await auth.register({
        email: email.value,
        username: username.value,
        password: password.value,
        invite_code: inviteCode.value.trim(),
      })
    }
    await router.replace('/team/profile')
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { detail?: string | unknown } } }
    const d = ax.response?.data?.detail
    error.value =
      typeof d === 'string'
        ? d
        : Array.isArray(d)
          ? d.map((x: { msg?: string }) => x.msg).filter(Boolean).join('; ')
          : 'Не удалось зарегистрироваться'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col items-center pt-8">
    <p class="mb-2 font-mono text-xs text-cyan-500/80">// remote: register + team</p>
    <h1 class="mb-2 text-center text-3xl font-bold tracking-tight text-slate-100">
      Регистрация · <span class="text-cyan-400">{{ title }}</span>
    </h1>
    <p class="mb-6 text-center text-sm text-slate-500">
      Капитан создаёт команду и получает код приглашения. Участники вводят код и становятся членами команды.
    </p>

    <div class="mb-6 flex gap-2 rounded-full border border-white/10 bg-slate-900/60 p-1">
      <button
        type="button"
        class="flex-1 rounded-full px-4 py-2 font-mono text-xs transition"
        :class="mode === 'create' ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40' : 'text-slate-500'"
        @click="mode = 'create'"
      >
        new_team
      </button>
      <button
        type="button"
        class="flex-1 rounded-full px-4 py-2 font-mono text-xs transition"
        :class="mode === 'join' ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40' : 'text-slate-500'"
        @click="mode = 'join'"
      >
        invite_code
      </button>
    </div>

    <form
      class="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm"
      @submit.prevent="submit"
    >
      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">email</span>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
            autocomplete="email"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">username</span>
          <input
            v-model="username"
            type="text"
            required
            minlength="2"
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
            minlength="4"
            class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
            autocomplete="new-password"
          />
        </label>

        <template v-if="mode === 'join'">
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">invite_code</span>
            <input
              v-model="inviteCode"
              type="text"
              required
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-emerald-100 outline-none ring-emerald-500/30 transition focus:border-emerald-500/50 focus:ring-2"
              placeholder="код от капитана"
            />
          </label>
        </template>

        <template v-else>
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">team name</span>
            <input
              v-model="teamName"
              type="text"
              required
              minlength="2"
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">contact</span>
            <input
              v-model="contact"
              type="text"
              required
              minlength="3"
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
              placeholder="telegram / email команды"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">description</span>
            <textarea
              v-model="description"
              rows="3"
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
              placeholder="питч для жюри"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">repo_url</span>
            <input
              v-model="repoUrl"
              type="url"
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
              placeholder="https://github.com/..."
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-slate-500">roster_line</span>
            <input
              v-model="rosterLine"
              type="text"
              class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-cyan-100 outline-none ring-cyan-500/30 transition focus:border-cyan-500/50 focus:ring-2"
              placeholder="состав текстом (опционально)"
            />
          </label>
        </template>

        <p v-if="error" class="font-mono text-sm text-rose-400">{{ error }}</p>
        <button
          type="submit"
          class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 py-3.5 font-mono text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 disabled:opacity-50"
          :disabled="busy"
        >
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          <span v-else>$ register --with-team</span>
        </button>
      </div>
    </form>
  </div>
</template>
