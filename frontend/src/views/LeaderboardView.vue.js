/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/http';
import { useSocket } from '../composables/useSocket';
const rows = ref([]);
const err = ref('');
const { ensureConnected } = useSocket();
function medalRowClass(rank) {
    if (rank === 1) {
        return 'border-amber-400/50 bg-gradient-to-r from-amber-950/55 via-slate-900/70 to-amber-900/40 shadow-amber-900/20 ring-1 ring-amber-400/35';
    }
    if (rank === 2) {
        return 'border-slate-300/40 bg-gradient-to-r from-slate-700/50 via-slate-900/65 to-slate-600/40 shadow-slate-900/25 ring-1 ring-slate-300/30';
    }
    if (rank === 3) {
        return 'border-orange-700/45 bg-gradient-to-r from-orange-950/50 via-amber-950/35 to-slate-900/60 shadow-orange-950/20 ring-1 ring-orange-600/30';
    }
    return 'border-white/10 bg-slate-900/50 shadow-black/20';
}
function rankBadgeClass(rank) {
    if (rank === 1)
        return 'bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 ring-amber-200/40';
    if (rank === 2)
        return 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950 ring-slate-200/40';
    if (rank === 3)
        return 'bg-gradient-to-br from-orange-300 to-amber-800 text-slate-950 ring-orange-300/35';
    return 'bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400 ring-white/10';
}
async function load() {
    try {
        const { data } = await api.get('/api/scores/leaderboard');
        rows.value = data;
    }
    catch {
        err.value = 'Не удалось загрузить лидерборд';
    }
}
onMounted(async () => {
    await load();
    const s = ensureConnected();
    s.on('rating_updated', () => {
        load();
    });
});
onUnmounted(() => {
    const s = ensureConnected();
    s.off('rating_updated');
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-8 text-center" },
});
/** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mb-2 font-mono text-xs text-emerald-500/80" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-500/80']} */ ;
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
if (__VLS_ctx.err) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-4 text-center font-mono text-sm text-rose-400" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-400']} */ ;
    (__VLS_ctx.err);
}
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.TransitionGroup | typeof __VLS_components.TransitionGroup} */
TransitionGroup;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "lb",
    tag: "ul",
    ...{ class: "relative mx-auto max-w-3xl space-y-3 px-0 sm:px-0" },
}));
const __VLS_2 = __VLS_1({
    name: "lb",
    tag: "ul",
    ...{ class: "relative mx-auto max-w-3xl space-y-3 px-0 sm:px-0" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-0']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
for (const [r] of __VLS_vFor((__VLS_ctx.rows))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
        key: (r.team_id),
        ...{ class: "group flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/25 hover:shadow-cyan-900/20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5" },
        ...{ class: (__VLS_ctx.medalRowClass(r.rank)) },
    });
    /** @type {__VLS_StyleScopedClasses['group']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:shadow-cyan-900/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:gap-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:gap-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ring-2 sm:h-11 sm:w-11 sm:text-lg" },
        ...{ class: (__VLS_ctx.rankBadgeClass(r.rank)) },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:h-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:w-11']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
    (r.rank);
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        to: (`/teams/${r.team_id}`),
        ...{ class: "min-w-0 flex-1 truncate font-semibold text-slate-100 underline decoration-cyan-500/0 decoration-2 underline-offset-4 transition group-hover:decoration-cyan-400/80" },
    }));
    const __VLS_8 = __VLS_7({
        to: (`/teams/${r.team_id}`),
        ...{ class: "min-w-0 flex-1 truncate font-semibold text-slate-100 underline decoration-cyan-500/0 decoration-2 underline-offset-4 transition group-hover:decoration-cyan-400/80" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['underline']} */ ;
    /** @type {__VLS_StyleScopedClasses['decoration-cyan-500/0']} */ ;
    /** @type {__VLS_StyleScopedClasses['decoration-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['underline-offset-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['group-hover:decoration-cyan-400/80']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
    (r.team_name);
    // @ts-ignore
    [err, err, rows, medalRowClass, rankBadgeClass,];
    var __VLS_9;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hidden font-mono text-[10px] text-slate-500 sm:block sm:max-w-[14rem] sm:truncate" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:block']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:max-w-[14rem]']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:truncate']} */ ;
    (r.jury_percent?.toFixed?.(2) ?? '—');
    ((r.sympathy_bonus_percent ?? 0).toFixed(2));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex w-full flex-col items-end gap-1 sm:w-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-end']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:w-auto']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "shrink-0 rounded-lg bg-black/40 px-3 py-1.5 font-mono text-base tabular-nums text-emerald-400 ring-1 ring-emerald-500/25 sm:text-lg" },
    });
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['tabular-nums']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-emerald-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-emerald-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
    (r.total_percent.toFixed(2));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-[10px] text-slate-500 sm:hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:hidden']} */ ;
    (r.jury_percent?.toFixed?.(2) ?? '—');
    ((r.sympathy_bonus_percent ?? 0).toFixed(2));
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
