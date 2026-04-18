/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/http';
import { useSocket } from '../composables/useSocket';
const rows = ref([]);
const err = ref('');
const { ensureConnected } = useSocket();
function podiumCardClass(rank) {
    if (rank === 1) {
        return 'border-amber-400/55 bg-gradient-to-b from-amber-950/70 via-slate-900/90 to-black shadow-amber-900/30 ring-2 ring-amber-400/40';
    }
    if (rank === 2) {
        return 'border-slate-300/45 bg-gradient-to-b from-slate-700/60 via-slate-900/90 to-black shadow-slate-900/30 ring-2 ring-slate-300/35';
    }
    if (rank === 3) {
        return 'border-orange-700/50 bg-gradient-to-b from-orange-950/65 via-amber-950/40 to-black shadow-orange-950/25 ring-2 ring-orange-600/35';
    }
    return 'border-white/10 bg-gradient-to-b from-slate-900/90 to-black';
}
function podiumBadgeClass(rank) {
    if (rank === 1)
        return 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-900/40';
    if (rank === 2)
        return 'bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 text-slate-950 shadow-lg shadow-slate-900/40';
    if (rank === 3)
        return 'bg-gradient-to-r from-orange-300 via-amber-600 to-amber-900 text-slate-950 shadow-lg shadow-orange-950/40';
    return 'from-slate-600 to-slate-800 text-white';
}
async function load() {
    try {
        const { data } = await api.get('/api/scores/podium', { params: { limit: 3 } });
        rows.value = data;
    }
    catch {
        err.value = 'Не удалось загрузить подиум';
    }
}
onMounted(async () => {
    await load();
    const s = ensureConnected();
    s.on('rating_updated', load);
});
onUnmounted(() => {
    const s = ensureConnected();
    s.off('rating_updated', load);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "px-1 sm:px-0" },
});
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-0']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-10 text-center" },
});
/** @type {__VLS_StyleScopedClasses['mb-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mb-2 font-mono text-xs text-amber-400/80" },
});
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-400/80']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "text-3xl font-bold text-slate-100 sm:text-4xl" },
});
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-4xl']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "mx-auto mt-3 max-w-md text-sm text-slate-500" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
if (__VLS_ctx.err) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-6 text-center font-mono text-sm text-rose-400" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-400']} */ ;
    (__VLS_ctx.err);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
for (const [r] of __VLS_vFor((__VLS_ctx.rows))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (r.team_id),
        ...{ class: "relative overflow-hidden rounded-3xl p-6 text-center shadow-xl" },
        ...{ class: ([
                __VLS_ctx.podiumCardClass(r.rank),
                r.rank === 1 ? 'lg:-translate-y-2' : '',
            ]) },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-4 inline-flex rounded-full px-4 py-1.5 font-mono text-sm font-bold" },
        ...{ class: (__VLS_ctx.podiumBadgeClass(r.rank)) },
    });
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    (r.rank);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "mb-3 font-mono text-base font-semibold text-white sm:text-lg" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        to: (`/teams/${r.team_id}`),
        ...{ class: "hover:text-cyan-300" },
    }));
    const __VLS_2 = __VLS_1({
        to: (`/teams/${r.team_id}`),
        ...{ class: "hover:text-cyan-300" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['hover:text-cyan-300']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    (r.team_name);
    // @ts-ignore
    [err, err, rows, podiumCardClass, podiumBadgeClass,];
    var __VLS_3;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-mono text-2xl font-bold tabular-nums text-emerald-400 sm:text-3xl" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['tabular-nums']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-emerald-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-3xl']} */ ;
    (r.total_percent.toFixed(2));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mt-2 font-mono text-[10px] leading-relaxed text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    ((r.jury_percent ?? 0).toFixed(2));
    ((r.sympathy_bonus_percent ?? 0).toFixed(2));
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
