<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '../api/http'
import { useSocket } from '../composables/useSocket'
import { useResolvedTeamId } from '../composables/useResolvedTeamId'
import { useAuthStore } from '../stores/auth'
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback'

interface Message {
  id: number
  team_id: number
  author_id: string
  author_username: string
  author_role_label: string
  text: string
  created_at: string
}

const messages = ref<Message[]>([])
const text = ref('')
const sendErr = ref('')

const auth = useAuthStore()
const { teamId, err, teamsList, resolving, resolve, selectTeam, isStaff } = useResolvedTeamId({
  syncQueryWhenStaffDefaults: true,
})

const teamIdNum = computed(() => teamId.value ?? NaN)
const staff = computed(() => isStaff())
const myId = computed(() => auth.user?.id ?? '')

const { ensureConnected } = useSocket()

async function loadMessages() {
  if (!Number.isFinite(teamIdNum.value)) return
  sendErr.value = ''
  const { data } = await api.get<Message[]>(`/api/chat/${teamIdNum.value}`)
  messages.value = data.map((row) => ({
    ...row,
    author_username: row.author_username ?? '?',
    author_role_label: row.author_role_label ?? '—',
  }))
}

async function send() {
  if (!text.value.trim() || !Number.isFinite(teamIdNum.value)) return
  try {
    await api.post('/api/chat/', { team_id: teamIdNum.value, text: text.value.trim() })
    text.value = ''
    await loadMessages()
  } catch {
    sendErr.value = 'Не удалось отправить сообщение.'
  }
}

function setupSocket() {
  if (!Number.isFinite(teamIdNum.value)) return
  const s = ensureConnected()
  s.emit('join_team_chat', { team_id: teamIdNum.value })
  s.on('new_message', (raw: Message) => {
    const payload: Message = {
      ...raw,
      author_username: raw.author_username ?? '?',
      author_role_label: raw.author_role_label ?? '—',
    }
    if (payload.team_id !== teamIdNum.value) return
    if (messages.value.some((m) => m.id === payload.id)) return
    messages.value = [...messages.value, payload].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  })
}

onMounted(async () => {
  await resolve()
  await loadMessages()
  setupSocket()
})

watch(teamIdNum, async () => {
  const s = ensureConnected()
  s.off('new_message')
  await loadMessages()
  setupSocket()
})

onUnmounted(() => {
  const s = ensureConnected()
  s.off('new_message')
})

function isMine(m: Message) {
  return String(m.author_id) === String(myId.value)
}

function rolePillClass(label: string, mine: boolean) {
  const base = mine ? 'ring-white/25' : 'ring-white/10'
  if (label === 'капитан') return `${base} border border-amber-400/50 bg-amber-500/25 text-amber-50`
  if (label === 'жюри') return `${base} border border-cyan-400/45 bg-cyan-500/20 text-cyan-50`
  if (label === 'админ') return `${base} border border-rose-400/45 bg-rose-500/20 text-rose-50`
  return `${base} border border-emerald-400/35 bg-emerald-500/15 text-emerald-50`
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">// чат команды</p>
      <h1
        class="bg-gradient-to-r from-cyan-200 via-white to-rose-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
      >
        Чат
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ staff ? 'Выберите команду сверху — переписка внутри карточки.' : 'Сообщения вашей команды.' }}
      </p>
    </div>

    <p v-if="err" class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
      {{ err }}
    </p>

    <!-- Не v-else-if: иначе у admin/expert скрывался сам чат, оставалась только лента команд -->
    <div
      v-if="!err && staff && teamsList.length"
      class="-mx-1 flex gap-3 overflow-x-auto pb-1"
    >
      <button
        v-for="t in teamsList"
        :key="t.id"
        type="button"
        class="group relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl border transition"
        :class="
          t.id === teamId
            ? 'border-cyan-400/60 ring-2 ring-cyan-400/25'
            : 'border-white/10 hover:border-cyan-300/30'
        "
        @click="selectTeam(t.id)"
      >
        <img
          :src="teamPhotoSrc(t.photo_url)"
          :alt="t.name"
          class="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
          @error="onTeamPhotoError"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <span class="absolute bottom-2 left-1.5 right-1.5 truncate text-left text-[11px] font-semibold text-white">
          {{ t.name }}
        </span>
      </button>
    </div>

    <template v-if="!err && Number.isFinite(teamIdNum)">
      <div
        class="flex max-h-[min(680px,78vh)] min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-merge"
      >
        <div
          class="border-b border-white/5 bg-gradient-to-r from-cyan-500/10 via-transparent to-rose-500/10 px-4 py-3"
        >
          <p class="font-mono text-[10px] uppercase tracking-wider text-slate-500">активный чат</p>
          <p class="truncate text-sm font-semibold text-slate-100">
            команда №{{ teamIdNum }}
          </p>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          <p v-if="sendErr" class="text-center font-mono text-xs text-rose-400">{{ sendErr }}</p>
          <div
            v-for="m in messages"
            :key="m.id"
            class="flex"
            :class="isMine(m) ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-lg"
              :class="
                isMine(m)
                  ? 'rounded-br-md bg-gradient-to-br from-cyan-600 to-emerald-700 text-white'
                  : 'rounded-bl-md border border-white/10 bg-slate-800/95 text-slate-100'
              "
            >
              <div
                class="mb-1.5 flex flex-wrap items-center gap-1.5"
                :class="isMine(m) ? 'flex-row-reverse justify-end' : ''"
              >
                <span class="truncate text-[13px] font-semibold tracking-tight">@{{ m.author_username }}</span>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide"
                  :class="rolePillClass(m.author_role_label, isMine(m))"
                >
                  {{ m.author_role_label }}
                </span>
              </div>
              <p class="whitespace-pre-wrap leading-relaxed">{{ m.text }}</p>
              <p class="mt-1.5 font-mono text-[10px] opacity-55" :class="isMine(m) ? 'text-right' : 'text-left'">
                {{ m.created_at }}
              </p>
            </div>
          </div>
          <p v-if="!messages.length" class="py-12 text-center text-sm text-slate-500">
            Пока тихо — напишите первое сообщение.
          </p>
        </div>
        <div class="border-t border-white/5 p-3">
          <div class="join w-full">
            <input
              v-model="text"
              class="input join-item flex-1 border-white/10 bg-black/30 font-sans text-sm focus:border-cyan-500/40"
              placeholder="Сообщение…"
              @keyup.enter="send"
            />
            <button
              type="button"
              class="btn join-item border-0 bg-gradient-to-r from-rose-500 to-amber-500 font-mono text-xs text-white hover:opacity-95"
              @click="send"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="resolving" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg text-cyan-400" />
    </div>
  </div>
</template>
