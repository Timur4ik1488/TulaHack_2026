/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
import { apiErrorMessage } from '../utils/apiErrorMessage';
const auth = useAuthStore();
const minutes = ref(45);
const secondsLeft = ref(0);
const deadlinePassed = ref(false);
const msg = ref('');
const busy = ref(false);
let pollHandle = null;
const display = computed(() => {
    const m = Math.floor(secondsLeft.value / 60);
    const s = secondsLeft.value % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
});
const isRunning = computed(() => secondsLeft.value > 0);
async function poll() {
    try {
        const { data } = await api.get('/api/timer/');
        deadlinePassed.value = !!data.deadline_passed;
        if (data.last_duration_minutes != null && Number.isFinite(data.last_duration_minutes)) {
            minutes.value = Math.round(data.last_duration_minutes);
        }
        if (!data.deadline_at) {
            secondsLeft.value = 0;
            return;
        }
        const end = new Date(data.deadline_at).getTime();
        const srv = new Date(data.server_now).getTime();
        secondsLeft.value = Math.max(0, Math.floor((end - srv) / 1000));
        if (secondsLeft.value === 0 && data.deadline_at) {
            deadlinePassed.value = true;
        }
    }
    catch {
        /* гость без сети — тихо */
    }
}
async function start() {
    if (auth.role !== 'admin') {
        msg.value = 'Только админ может запускать серверный таймер';
        return;
    }
    busy.value = true;
    msg.value = '';
    try {
        await api.post('/api/timer/start', { minutes: minutes.value });
        await poll();
        msg.value = 'Таймер запущен на сервере';
    }
    catch (e) {
        msg.value = apiErrorMessage(e, 'Не удалось запустить');
    }
    finally {
        busy.value = false;
    }
}
async function stop() {
    if (auth.role !== 'admin')
        return;
    busy.value = true;
    msg.value = '';
    try {
        await api.post('/api/timer/stop');
        await poll();
        msg.value = 'Таймер остановлен';
    }
    catch (e) {
        msg.value = apiErrorMessage(e, 'Не удалось остановить');
    }
    finally {
        busy.value = false;
    }
}
onMounted(() => {
    void poll();
    pollHandle = setInterval(poll, 1000);
});
onUnmounted(() => {
    if (pollHandle)
        clearInterval(pollHandle);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto max-w-lg space-y-8 px-1 sm:px-0" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-8']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-0']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-center" },
});
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mb-2 font-mono text-xs text-cyan-500/80" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-cyan-500/80']} */ ;
(__VLS_ctx.auth.role === 'admin' ? 'admin · таймер на сервере' : 'таймер на сервере (только просмотр)');
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent" },
});
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-cyan-200']} */ ;
/** @type {__VLS_StyleScopedClasses['to-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-clip-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['text-transparent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mt-2 text-sm text-slate-500" },
});
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 text-center shadow-2xl backdrop-blur-md hs-glow-merge sm:p-8" },
});
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
/** @type {__VLS_StyleScopedClasses['hs-glow-merge']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:p-8']} */ ;
if (__VLS_ctx.auth.role === 'admin') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "mx-auto block max-w-xs text-left" },
    });
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mb-2 block font-mono text-[10px] uppercase tracking-wider text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "1",
        step: "1",
        ...{ class: "input w-full border-white/10 bg-black/40 font-mono text-slate-100 focus:border-cyan-500/40" },
        disabled: (__VLS_ctx.busy || __VLS_ctx.isRunning),
    });
    (__VLS_ctx.minutes);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:border-cyan-500/40']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "my-6 bg-gradient-to-br from-cyan-400 via-white to-emerald-400 bg-clip-text font-mono text-5xl font-bold tabular-nums text-transparent sm:text-6xl md:text-7xl" },
});
/** @type {__VLS_StyleScopedClasses['my-6']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-cyan-400']} */ ;
/** @type {__VLS_StyleScopedClasses['via-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-emerald-400']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-clip-text']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['tabular-nums']} */ ;
/** @type {__VLS_StyleScopedClasses['text-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-6xl']} */ ;
/** @type {__VLS_StyleScopedClasses['md:text-7xl']} */ ;
(__VLS_ctx.display);
if (__VLS_ctx.isRunning && __VLS_ctx.minutes) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-2 font-mono text-[11px] text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-cyan-400/90" },
    });
    /** @type {__VLS_StyleScopedClasses['text-cyan-400/90']} */ ;
    (__VLS_ctx.minutes);
}
if (__VLS_ctx.deadlinePassed) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-4 rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 font-mono text-xs text-amber-100" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-amber-500/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-amber-950/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
}
if (__VLS_ctx.msg) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-4 font-mono text-xs text-slate-400" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    (__VLS_ctx.msg);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-3']} */ ;
if (__VLS_ctx.auth.role === 'admin') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.start) },
        type: "button",
        ...{ class: "btn border-0 bg-gradient-to-r from-emerald-600 to-cyan-600 font-mono text-sm text-white hover:opacity-95 disabled:opacity-40" },
        disabled: (__VLS_ctx.busy),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-emerald-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-cyan-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:opacity-95']} */ ;
    /** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
}
if (__VLS_ctx.auth.role === 'admin') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.stop) },
        type: "button",
        ...{ class: "btn border border-white/15 bg-white/5 font-mono text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40" },
        disabled: (__VLS_ctx.busy),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
}
if (__VLS_ctx.auth.role !== 'admin') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-4 font-mono text-[11px] text-slate-600" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
}
// @ts-ignore
[auth, auth, auth, auth, auth, busy, busy, busy, isRunning, isRunning, minutes, minutes, minutes, display, deadlinePassed, msg, msg, start, stop,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
