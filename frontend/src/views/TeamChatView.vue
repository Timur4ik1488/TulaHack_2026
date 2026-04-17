<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '../api/http'
import { useSocket } from '../composables/useSocket'

interface Message {
  id: number
  team_id: number
  author_id: string
  text: string
  created_at: string
}

const messages = ref<Message[]>([])
const text = ref('')
const err = ref('')
const teamId = ref<number | null>(null)
const { ensureConnected } = useSocket()

const teamIdNum = computed(() => teamId.value ?? NaN)

async function resolveTeamId() {
  err.value = ''
  teamId.value = null
  try {
    const { data } = await api.get<{ team: { id: number } }>('/api/teams/my/summary')
    teamId.value = data.team.id
  } catch {
    err.value = 'Сначала вступите в команду (профиль или регистрация).'
  }
}

async function loadMessages() {
  if (!Number.isFinite(teamIdNum.value)) return
  err.value = ''
  const { data } = await api.get<Message[]>(`/api/chat/${teamIdNum.value}`)
  messages.value = data
}

async function send() {
  if (!text.value.trim() || !Number.isFinite(teamIdNum.value)) return
  await api.post('/api/chat/', { team_id: teamIdNum.value, text: text.value.trim() })
  text.value = ''
  await loadMessages()
}

function setupSocket() {
  if (!Number.isFinite(teamIdNum.value)) return
  const s = ensureConnected()
  s.emit('join_team_chat', { team_id: teamIdNum.value })
  s.on('new_message', (payload: Message) => {
    if (payload.team_id !== teamIdNum.value) return
    if (messages.value.some((m) => m.id === payload.id)) return
    messages.value = [...messages.value, payload].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  })
}

onMounted(async () => {
  await resolveTeamId()
  await loadMessages()
  setupSocket()
})

watch(teamIdNum, async () => {
  await loadMessages()
  const s = ensureConnected()
  if (Number.isFinite(teamIdNum.value)) {
    s.emit('join_team_chat', { team_id: teamIdNum.value })
  }
})

onUnmounted(() => {
  const s = ensureConnected()
  s.off('new_message')
})
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">Чат команды</h1>
    <p v-if="err" class="text-error">{{ err }}</p>
    <template v-else>
      <div class="mb-4 max-h-96 space-y-2 overflow-y-auto rounded-lg bg-base-100 p-4 shadow-inner">
        <div v-for="m in messages" :key="m.id" class="chat chat-start">
          <div class="chat-header text-xs opacity-60">{{ m.author_id.slice(0, 8) }}…</div>
          <div class="chat-bubble">{{ m.text }}</div>
          <div class="chat-footer text-xs opacity-50">{{ m.created_at }}</div>
        </div>
      </div>
      <div class="join w-full">
        <input
          v-model="text"
          class="input input-bordered join-item w-full"
          placeholder="Сообщение…"
          @keyup.enter="send"
        />
        <button type="button" class="btn btn-primary join-item" @click="send">Отправить</button>
      </div>
    </template>
  </div>
</template>
