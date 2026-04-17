<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'

interface Team {
  id: number
  name: string
  description: string | null
  case_number: number | null
  photo_url: string | null
}

const route = useRoute()
const team = ref<Team | null>(null)
const err = ref('')

const id = computed(() => Number(route.params.id))

async function load() {
  err.value = ''
  team.value = null
  try {
    const { data } = await api.get<Team>(`/api/teams/${id.value}`)
    team.value = data
  } catch {
    err.value = '// 404 team not found'
  }
}

onMounted(load)
watch(id, load)
</script>

<template>
  <div v-if="team" class="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-sm">
    <div class="relative h-56 overflow-hidden bg-gradient-to-br from-slate-800 to-black md:h-72">
      <img v-if="team.photo_url" :src="team.photo_url" :alt="team.name" class="h-full w-full object-cover" />
      <div v-else class="flex h-full items-center justify-center font-mono text-6xl text-cyan-500/25">&lt;/&gt;</div>
    </div>
    <div class="p-8">
      <h1 class="font-mono text-3xl font-bold text-white">{{ team.name }}</h1>
      <p v-if="team.description" class="mt-4 whitespace-pre-wrap leading-relaxed text-slate-400">{{ team.description }}</p>
      <p v-if="team.case_number != null" class="mt-4 font-mono text-xs text-slate-600">track: case #{{ team.case_number }}</p>
    </div>
  </div>
  <p v-else-if="err" class="text-center font-mono text-rose-400">{{ err }}</p>
  <div v-else class="flex justify-center py-20">
    <span class="loading loading-spinner loading-lg text-cyan-500" />
  </div>
</template>
