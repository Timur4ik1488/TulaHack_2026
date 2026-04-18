<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { onUserAvatarError, userAvatarSrc } from '../composables/useTeamPhotoFallback'
import { apiErrorMessage } from '../utils/apiErrorMessage'

const auth = useAuthStore()

interface UserRow {
  id: string
  email: string
  username: string
  role: string
  is_active: boolean
  is_blocked: boolean
  avatar_url?: string | null
}

const users = ref<UserRow[]>([])
const avatarBusyId = ref<string | null>(null)
const msg = ref('')
const createBusy = ref(false)
const createEmail = ref('')
const createUsername = ref('')
const createPassword = ref('')
const createRole = ref<'expert' | 'participant' | 'admin'>('expert')

function roleLabel(role: string) {
  if (role === 'admin') return 'admin'
  if (role === 'expert') return 'Жюри'
  if (role === 'participant') return 'Участник'
  return role
}

async function load() {
  const { data } = await api.get<UserRow[]>('/api/users/')
  users.value = data
}

async function setRole(userId: string, role: string) {
  if (userId === auth.user?.id && role !== 'admin') {
    return
  }
  msg.value = ''
  try {
    await api.patch(`/api/users/${userId}/role`, { role })
    await load()
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось сменить роль')
  }
}

async function createUser() {
  msg.value = ''
  createBusy.value = true
  try {
    await api.post('/api/users/', {
      email: createEmail.value.trim(),
      username: createUsername.value.trim(),
      password: createPassword.value,
      role: createRole.value,
    })
    createEmail.value = ''
    createUsername.value = ''
    createPassword.value = ''
    createRole.value = 'expert'
    await load()
    msg.value = 'Пользователь создан'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Не удалось создать пользователя')
  } finally {
    createBusy.value = false
  }
}

async function onAvatarForUser(userId: string, ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarBusyId.value = userId
  msg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await api.post(`/api/users/${userId}/avatar`, fd)
    if (userId === auth.user?.id) {
      await auth.fetchMe()
    }
    await load()
    msg.value = 'Аватар обновлён'
  } catch (e) {
    msg.value = apiErrorMessage(e, 'Ошибка загрузки аватара')
  } finally {
    avatarBusyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-amber-400/80">admin · пользователи</p>
      <h1
        class="bg-gradient-to-r from-amber-200 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
      >
        Пользователи
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Создание аккаунтов (по умолчанию — эксперт жюри), смена роли, аватар. Метрики и логи:
        <a
          href="/ops/grafana/"
          class="text-cyan-400 underline decoration-cyan-500/30 underline-offset-2 hover:text-cyan-300"
        >/ops/grafana/</a>
        (после <span class="font-mono text-slate-400">docker compose up</span>).
      </p>
    </div>

    <section
      class="mx-auto max-w-xl rounded-3xl border border-cyan-500/20 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md sm:p-8"
    >
      <p class="mb-1 font-mono text-xs text-cyan-500/80">админ · новый юзер</p>
      <h2 class="text-lg font-semibold text-slate-100">Новый пользователь</h2>
      <p class="mt-1 text-xs text-slate-500">Пароль не короче 8 символов. Роль по умолчанию — expert.</p>
      <form class="mt-5 space-y-4" @submit.prevent="createUser">
        <div>
          <label class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">email</label>
          <input
            v-model="createEmail"
            type="email"
            required
            autocomplete="off"
            class="input input-bordered w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100"
            placeholder="zhuri@example.com"
          />
        </div>
        <div>
          <label class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">username</label>
          <input
            v-model="createUsername"
            type="text"
            required
            minlength="2"
            autocomplete="off"
            class="input input-bordered w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100"
            placeholder="имя_на_сайте"
          />
        </div>
        <div>
          <label class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">пароль</label>
          <input
            v-model="createPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="input input-bordered w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">роль</label>
          <select
            v-model="createRole"
            class="hs-select select select-bordered w-full min-h-[3rem] border-white/15 bg-slate-900/95 py-2.5 font-mono text-sm leading-normal text-slate-100"
          >
            <option value="expert">Жюри (expert)</option>
            <option value="participant">Участник</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          type="submit"
          class="btn w-full border-0 bg-gradient-to-r from-cyan-600 to-emerald-600 font-mono text-sm text-white hover:opacity-95 disabled:opacity-40"
          :disabled="createBusy"
        >
          Создать пользователя
        </button>
      </form>
    </section>

    <p v-if="msg" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center font-mono text-sm text-slate-300">
      {{ msg }}
    </p>

    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="u in users"
        :key="u.id"
        class="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/45 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/20"
      >
        <div class="flex gap-4 p-4">
          <div class="relative shrink-0">
            <img
              :src="userAvatarSrc(u.avatar_url)"
              :alt="u.username"
              class="h-16 w-16 rounded-full border-2 border-white/10 object-cover ring-2 ring-cyan-500/15"
              @error="onUserAvatarError"
            />
            <label
              class="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-cyan-500/40 bg-slate-950 text-xs text-cyan-300 shadow-lg hover:bg-cyan-500/20"
            >
              +
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                :disabled="avatarBusyId === u.id"
                @change="onAvatarForUser(u.id, $event)"
              />
            </label>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-slate-100">@{{ u.username }}</p>
            <p class="truncate font-mono text-[11px] text-slate-500">{{ u.email }}</p>
            <span
              class="mt-2 inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
              :class="
                u.role === 'admin'
                  ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                  : u.role === 'expert'
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-500/40 bg-slate-500/10 text-slate-300'
              "
            >
              {{ roleLabel(u.role) }}
            </span>
          </div>
        </div>
        <div class="border-t border-white/5 bg-black/20 px-4 py-3">
          <template v-if="u.id === auth.user?.id">
            <p class="text-center font-mono text-[10px] text-slate-500">свою роль не понизить</p>
          </template>
          <div v-else class="flex flex-wrap justify-center gap-1">
            <button
              type="button"
              class="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300 hover:border-emerald-500/30"
              @click="setRole(u.id, 'participant')"
            >
              Участник
            </button>
            <button
              type="button"
              class="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-500/30"
              @click="setRole(u.id, 'expert')"
            >
              Жюри
            </button>
            <button
              type="button"
              class="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-amber-200 hover:border-amber-500/30"
              @click="setRole(u.id, 'admin')"
            >
              admin
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
