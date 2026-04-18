/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback';
const auth = useAuthStore();
const teams = ref([]);
const index = ref(0);
const busy = ref(false);
const msg = ref('');
const myVotes = ref(new Map());
const dragX = ref(0);
const dragging = ref(false);
let startX = 0;
let activePointerId = null;
const current = computed(() => teams.value[index.value] ?? null);
const nextTeam = computed(() => teams.value[index.value + 1] ?? null);
const nextNext = computed(() => teams.value[index.value + 2] ?? null);
const cardStyle = computed(() => {
    const r = dragX.value * 0.05;
    return {
        transform: `translateX(${dragX.value}px) rotate(${r}deg)`,
        transition: dragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
    };
});
const plusHint = computed(() => Math.min(1, Math.max(0, dragX.value / 120)));
const minusHint = computed(() => Math.min(1, Math.max(0, -dragX.value / 120)));
const currentVoteLabel = computed(() => {
    const t = current.value;
    if (!t)
        return null;
    const v = myVotes.value.get(t.id);
    if (v === undefined)
        return null;
    return v > 0 ? '+1' : '−1';
});
const leaderboard = ref([]);
function storageKeyIdx() {
    const uid = auth.user?.id || 'guest';
    return `hs_sympathy_index_${uid}`;
}
async function loadMyVotes() {
    try {
        const { data } = await api.get('/api/sympathy/me');
        const m = new Map();
        for (const v of data) {
            m.set(v.team_id, v.value);
        }
        myVotes.value = m;
    }
    catch {
        myVotes.value = new Map();
    }
}
async function loadTeams() {
    const { data } = await api.get('/api/teams/');
    teams.value = data;
}
function restoreIndex() {
    const n = teams.value.length;
    if (!n) {
        index.value = 0;
        return;
    }
    const raw = localStorage.getItem(storageKeyIdx());
    const saved = raw != null ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(saved) && saved >= 0 && saved < n) {
        index.value = saved;
        return;
    }
    const firstUnvoted = teams.value.findIndex((t) => !myVotes.value.has(t.id));
    index.value = firstUnvoted >= 0 ? firstUnvoted : 0;
}
watch(index, (i) => {
    if (auth.user) {
        localStorage.setItem(storageKeyIdx(), String(i));
    }
});
async function loadLeaderboard() {
    const { data } = await api.get('/api/sympathy/leaderboard');
    leaderboard.value = data.rows.slice(0, 8);
}
onMounted(async () => {
    await auth.fetchMe();
    await loadTeams();
    await loadMyVotes();
    restoreIndex();
    await loadLeaderboard();
});
function onPointerDown(e) {
    if (busy.value || !current.value)
        return;
    activePointerId = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.value = true;
    startX = e.clientX;
}
function onPointerMove(e) {
    if (!dragging.value || e.pointerId !== activePointerId)
        return;
    dragX.value = e.clientX - startX;
}
async function onPointerUp(e) {
    if (e.pointerId !== activePointerId)
        return;
    if (!dragging.value)
        return;
    activePointerId = null;
    try {
        ;
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    catch {
        /* ignore */
    }
    dragging.value = false;
    const dx = dragX.value;
    const th = 88;
    if (dx > th) {
        await postVote(1);
    }
    else if (dx < -th) {
        await postVote(-1);
    }
    dragX.value = 0;
    await nextTick();
}
async function postVote(value) {
    const team = current.value;
    if (!team)
        return;
    busy.value = true;
    msg.value = '';
    try {
        await api.post('/api/sympathy/vote', {
            team_id: team.id,
            value,
        });
        myVotes.value.set(team.id, value);
        msg.value = value === 1 ? 'Голос учтён: +1' : 'Голос учтён: −1';
        await loadLeaderboard();
        if (index.value < teams.value.length - 1) {
            index.value += 1;
        }
    }
    catch (e) {
        const ax = e;
        const d = ax.response?.data?.detail;
        msg.value = `Ошибка ${ax.response?.status ?? ''} ${typeof d === 'string' ? d : ''}`.trim();
    }
    finally {
        busy.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto max-w-xl" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-xl']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-6 text-center" },
});
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mb-2 font-mono text-xs text-violet-400/90" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-violet-400/90']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "text-3xl font-bold tracking-tight text-slate-100" },
});
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mt-2 text-sm text-slate-500" },
});
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "font-mono text-violet-300" },
});
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-violet-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "font-mono text-violet-300" },
});
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-violet-300']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "relative mx-auto h-[min(34rem,72vh)] w-full max-w-md touch-none select-none" },
});
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['h-[min(34rem,72vh)]']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['touch-none']} */ ;
/** @type {__VLS_StyleScopedClasses['select-none']} */ ;
if (__VLS_ctx.nextNext) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-x-4 top-10 h-[85%] rounded-3xl border border-white/5 bg-slate-900/40 shadow-xl" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-x-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-[85%]']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
}
if (__VLS_ctx.nextTeam) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-x-2 top-6 h-[88%] rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-x-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-[88%]']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
}
if (__VLS_ctx.current) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onPointerdown: (__VLS_ctx.onPointerDown) },
        ...{ onPointermove: (__VLS_ctx.onPointerMove) },
        ...{ onPointerup: (__VLS_ctx.onPointerUp) },
        ...{ onPointercancel: (__VLS_ctx.onPointerUp) },
        ...{ class: "absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-3xl border-2 border-violet-500/20 bg-slate-900 shadow-2xl active:cursor-grabbing" },
        ...{ class: ({
                'ring-2 ring-emerald-500/35': __VLS_ctx.plusHint > 0.35,
                'ring-2 ring-rose-500/35': __VLS_ctx.minusHint > 0.35,
            }) },
        ...{ style: (__VLS_ctx.cardStyle) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-grab']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-violet-500/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['active:cursor-grabbing']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-emerald-500/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-rose-500/35']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-emerald-500/15 font-mono text-4xl font-black uppercase tracking-widest text-emerald-200/90" },
        ...{ style: ({ opacity: __VLS_ctx.plusHint * 0.85 }) },
    });
    /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[1]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-emerald-500/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-black']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-emerald-200/90']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-rose-500/15 font-mono text-4xl font-black text-rose-200/90" },
        ...{ style: ({ opacity: __VLS_ctx.minusHint * 0.85 }) },
    });
    /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[1]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-rose-500/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-black']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-200/90']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative z-0 h-[52%] shrink-0 touch-none overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-[52%]']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['touch-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-slate-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-slate-900']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-black']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        ...{ onError: (__VLS_ctx.onTeamPhotoError) },
        src: (__VLS_ctx.teamPhotoSrc(__VLS_ctx.current.photo_url)),
        alt: (__VLS_ctx.current.name),
        ...{ class: "h-full w-full object-cover pointer-events-none" },
        draggable: "false",
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
    /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative z-10 flex flex-1 flex-col justify-between p-5" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-2 flex flex-wrap items-center gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "font-mono text-xl font-bold tracking-tight text-white" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    (__VLS_ctx.current.name);
    if (__VLS_ctx.currentVoteLabel) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] text-violet-200" },
        });
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-violet-400/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-violet-500/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-violet-200']} */ ;
        (__VLS_ctx.currentVoteLabel);
    }
    if (__VLS_ctx.current.description) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['line-clamp-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        (__VLS_ctx.current.description);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-mono text-[10px] text-slate-600" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
    (__VLS_ctx.index + 1);
    (__VLS_ctx.teams.length);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed border-white/15 bg-slate-900/50 p-8 text-center font-mono text-sm text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto mt-8 flex max-w-md items-center justify-center gap-10 px-2" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-10']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.postVote(-1);
            // @ts-ignore
            [nextNext, nextTeam, current, current, current, current, current, current, onPointerDown, onPointerMove, onPointerUp, onPointerUp, plusHint, plusHint, minusHint, minusHint, cardStyle, onTeamPhotoError, teamPhotoSrc, currentVoteLabel, currentVoteLabel, index, teams, postVote,];
        } },
    type: "button",
    ...{ class: "flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/50 bg-rose-500/10 text-2xl font-bold text-rose-200 shadow-lg transition hover:scale-105 disabled:opacity-40" },
    disabled: (__VLS_ctx.busy || !__VLS_ctx.current),
    'aria-label': "Минус один",
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-16']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-rose-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-rose-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-rose-200']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:scale-105']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.postVote(1);
            // @ts-ignore
            [current, postVote, busy,];
        } },
    type: "button",
    ...{ class: "flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 text-2xl font-bold text-emerald-200 shadow-lg transition hover:scale-105 disabled:opacity-40" },
    disabled: (__VLS_ctx.busy || !__VLS_ctx.current),
    'aria-label': "Плюс один",
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-16']} */ ;
/** @type {__VLS_StyleScopedClasses['w-16']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-emerald-500/50']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-200']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:scale-105']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
if (__VLS_ctx.msg) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-4 text-center font-mono text-xs text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    (__VLS_ctx.msg);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mt-10 rounded-2xl border border-white/10 bg-slate-900/40 p-4" },
});
/** @type {__VLS_StyleScopedClasses['mt-10']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "mb-3 font-mono text-xs uppercase tracking-wider text-slate-500" },
});
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.ol, __VLS_intrinsics.ol)({
    ...{ class: "space-y-1.5 font-mono text-sm" },
});
/** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
for (const [r, i] of __VLS_vFor((__VLS_ctx.leaderboard))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
        key: (r.team_id),
        ...{ class: "flex justify-between text-slate-300" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (i + 1);
    (r.team_name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-violet-300" },
    });
    /** @type {__VLS_StyleScopedClasses['text-violet-300']} */ ;
    (r.score > 0 ? '+' : '');
    (r.score);
    // @ts-ignore
    [current, busy, msg, msg, leaderboard,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
