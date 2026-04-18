<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import { apiErrorMessage } from '../utils/apiErrorMessage'

interface Criterion {
  id: number
  name: string
  weight: number
  max_score: number
}

const criteria = ref<Criterion[]>([])
const summary = ref<{ total_weight_percent: number; weights_sum_ok: boolean } | null>(null)

const form = reactive({ name: '', weight: 10, max_score: 10 })
const busy = ref(false)
const formMsg = ref('')

const weightHue = computed(() => {
  const w = form.weight
  if (w >= 25) return 'from-rose-500/40 to-amber-500/30'
  if (w >= 15) return 'from-fuchsia-500/35 to-cyan-500/25'
  return 'from-cyan-500/30 to-emerald-500/25'
})

async function load() {
  const [c, s] = await Promise.all([
    api.get<Criterion[]>('/api/criteria/'),
    api.get<{ total_weight_percent: number; weights_sum_ok: boolean }>('/api/criteria/weights-summary'),
  ])
  criteria.value = c.data
  summary.value = s.data
}

async function createCriterion() {
  busy.value = true
  formMsg.value = ''
  try {
    await api.post('/api/criteria/', {
      name: form.name,
      weight: form.weight,
      max_score: form.max_score,
    })
    form.name = ''
    form.weight = 10
    form.max_score = 10
    formMsg.value = 'Критерий добавлен'
    await load()
  } catch (e) {
    formMsg.value = apiErrorMessage(e, 'Не удалось создать критерий')
  } finally {
    busy.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Удалить критерий?')) return
  try {
    await api.delete(`/api/criteria/${id}`)
    await load()
  } catch (e) {
    formMsg.value = apiErrorMessage(e, 'Не удалось удалить')
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-10">
    <div class="text-center">
      <p class="mb-2 font-mono text-xs text-cyan-500/80">// admin · criteria</p>
      <h1
        class="bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-amber-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl"
      >
        Критерии оценки
      </h1>
      <p class="mx-auto mt-3 max-w-lg text-sm text-slate-500">
        Веса в процентах должны в сумме давать ~100% — иначе итоговый % по командам будет смещён.
      </p>
    </div>

    <p v-if="formMsg" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center font-mono text-sm text-slate-300">
      {{ formMsg }}
    </p>

    <div
      v-if="summary"
      class="flex flex-wrap items-center justify-center gap-4 rounded-2xl border px-6 py-4 font-mono text-sm backdrop-blur-sm"
      :class="
        summary.weights_sum_ok
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      "
    >
      <span>Σ весов: {{ summary.total_weight_percent }}%</span>
      <span class="opacity-80">{{ summary.weights_sum_ok ? '≈ OK' : 'подправьте веса' }}</span>
    </div>

    <section
      class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-merge"
    >
      <div
        class="relative border-b border-white/10 bg-gradient-to-br from-cyan-600/20 via-fuchsia-600/15 to-amber-500/20 px-6 py-5"
      >
        <div
          class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl"
        />
        <div
          class="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-rose-500/20 blur-2xl"
        />
        <h2 class="relative font-mono text-sm font-semibold uppercase tracking-widest text-slate-100">
          Новый критерий
        </h2>
        <p class="relative mt-1 text-xs text-slate-400">Имя, вес % и максимальный балл по шкале жюри.</p>
      </div>
      <div class="grid gap-4 p-6 md:grid-cols-12 md:items-end">
        <label class="block md:col-span-5">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">name</span>
          <input
            v-model="form.name"
            class="input w-full border-white/10 bg-black/40 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/40"
            placeholder="Например: Реализация"
          />
        </label>
        <label class="block md:col-span-3">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">weight %</span>
          <input
            v-model.number="form.weight"
            type="number"
            min="0"
            step="0.5"
            class="input w-full border-white/10 bg-black/40 font-mono text-cyan-100 focus:border-fuchsia-500/40"
          />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-500">max</span>
          <input
            v-model.number="form.max_score"
            type="number"
            min="1"
            step="0.5"
            class="input w-full border-white/10 bg-black/40 font-mono text-amber-100 focus:border-amber-500/40"
          />
        </label>
        <div class="md:col-span-2">
          <button
            type="button"
            class="btn h-12 w-full border-0 bg-gradient-to-r from-cyan-600 via-fuchsia-600 to-amber-600 font-mono text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:opacity-95 disabled:opacity-40"
            :disabled="busy || !form.name.trim()"
            @click="createCriterion"
          >
            добавить
          </button>
        </div>
        <div
          class="relative h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 md:col-span-12"
          :class="'bg-gradient-to-r ' + weightHue"
        >
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/30 to-white/5 transition-all"
            :style="{ width: `${Math.min(100, form.weight)}%` }"
          />
        </div>
      </div>
    </section>

    <section>
      <h2 class="mb-4 font-mono text-xs uppercase tracking-widest text-slate-500">список ({{ criteria.length }})</h2>
      <ul class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="c in criteria"
          :key="c.id"
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 transition hover:border-cyan-500/30"
        >
          <div
            class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:bg-fuchsia-500/15"
          />
          <div class="relative flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-[10px] text-slate-600">#{{ c.id }}</p>
              <h3 class="text-lg font-semibold text-slate-100">{{ c.name }}</h3>
            </div>
            <button
              type="button"
              class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-300 hover:bg-rose-500/20"
              @click="remove(c.id)"
            >
              удалить
            </button>
          </div>
          <div class="relative mt-4 flex flex-wrap gap-2">
            <span
              class="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-200"
            >
              вес {{ c.weight }}%
            </span>
            <span
              class="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-100"
            >
              max {{ c.max_score }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
