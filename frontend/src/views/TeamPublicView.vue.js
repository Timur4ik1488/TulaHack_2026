/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback';
const route = useRoute();
const auth = useAuthStore();
const team = ref(null);
const members = ref(null);
const err = ref('');
const id = computed(() => Number(route.params.id));
const coverSrc = computed(() => teamPhotoSrc(team.value?.photo_url));
function parseShots(raw) {
    if (!raw)
        return [];
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    }
    catch {
        return [];
    }
}
const shotUrls = computed(() => parseShots(team.value?.screenshots_json ?? null));
const solutionHref = computed(() => {
    const u = team.value?.solution_submission_url?.trim();
    if (!u)
        return null;
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
});
const repoHref = computed(() => {
    const raw = team.value?.repo_url?.trim();
    if (!raw)
        return null;
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
});
const sortedMembers = computed(() => {
    if (!members.value?.length)
        return [];
    return [...members.value].sort((a, b) => {
        const ra = a.role === 'captain' ? 0 : 1;
        const rb = b.role === 'captain' ? 0 : 1;
        return ra - rb;
    });
});
async function load() {
    err.value = '';
    team.value = null;
    members.value = null;
    try {
        const { data } = await api.get(`/api/teams/${id.value}`);
        team.value = data;
    }
    catch {
        err.value = '// 404 team not found';
    }
}
async function loadMembers() {
    if (!auth.user || !Number.isFinite(id.value)) {
        members.value = null;
        return;
    }
    try {
        const { data } = await api.get(`/api/teams/${id.value}/members`);
        members.value = data;
    }
    catch {
        members.value = null;
    }
}
onMounted(async () => {
    await load();
    await loadMembers();
});
watch(id, async () => {
    await load();
    await loadMembers();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.team) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-sm hs-glow-merge" },
    });
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/60']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['hs-glow-merge']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative h-56 overflow-hidden bg-gradient-to-br from-slate-800 to-black md:h-72" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-56']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-slate-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-black']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:h-72']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        ...{ onError: (__VLS_ctx.onTeamPhotoError) },
        src: (__VLS_ctx.coverSrc),
        alt: (__VLS_ctx.team.name),
        ...{ class: "h-full w-full object-cover" },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-t']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-slate-950']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-slate-950/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-transparent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute bottom-4 left-6 right-6" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['left-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-6']} */ ;
    if (__VLS_ctx.team.case_number != null) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-300/90']} */ ;
        (__VLS_ctx.team.case_number);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "font-mono text-2xl font-bold text-white drop-shadow md:text-3xl" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['drop-shadow']} */ ;
    /** @type {__VLS_StyleScopedClasses['md:text-3xl']} */ ;
    (__VLS_ctx.team.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-8 p-8" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-8']} */ ;
    if (__VLS_ctx.team.description) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "whitespace-pre-wrap leading-relaxed text-slate-400" },
        });
        /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        (__VLS_ctx.team.description);
    }
    if (__VLS_ctx.solutionHref) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "rounded-2xl border border-emerald-500/30 bg-emerald-950/25 p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-emerald-500/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-emerald-950/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-[10px] uppercase tracking-wider text-emerald-400/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-emerald-400/90']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.solutionHref),
            target: "_blank",
            rel: "noopener noreferrer",
            ...{ class: "mt-2 inline-flex break-all font-mono text-sm text-emerald-200 underline-offset-2 hover:text-emerald-100 hover:underline" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-emerald-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['underline-offset-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-emerald-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
        (__VLS_ctx.solutionHref);
    }
    if (__VLS_ctx.repoHref) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: (__VLS_ctx.repoHref),
            target: "_blank",
            rel: "noopener noreferrer",
            ...{ class: "flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-sm text-cyan-200 transition hover:border-cyan-500/35" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-slate-950/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/35']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-cyan-400/80" },
        });
        /** @type {__VLS_StyleScopedClasses['text-cyan-400/80']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "min-w-0 flex-1 truncate" },
        });
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (__VLS_ctx.team.repo_url);
    }
    if (__VLS_ctx.shotUrls.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "grid gap-2 sm:grid-cols-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        for (const [u, i] of __VLS_vFor((__VLS_ctx.shotUrls))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (i),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                href: (u),
                target: "_blank",
                rel: "noopener noreferrer",
                ...{ class: "block truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-cyan-200/90 hover:border-cyan-500/30" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-200/90']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/30']} */ ;
            (u);
            // @ts-ignore
            [team, team, team, team, team, team, team, team, onTeamPhotoError, coverSrc, solutionHref, solutionHref, solutionHref, repoHref, repoHref, shotUrls, shotUrls,];
        }
    }
    if (__VLS_ctx.sortedMembers.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "border-t border-white/10 pt-8" },
        });
        /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mb-4 font-mono text-xs uppercase tracking-widest text-cyan-500/80" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-500/80']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "mb-4 text-lg font-semibold text-slate-100" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "grid gap-3 sm:grid-cols-2" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        for (const [m] of __VLS_vFor((__VLS_ctx.sortedMembers))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (m.user_id),
                ...{ class: "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-sm transition hover:border-cyan-500/20" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-950/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/20']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "truncate font-medium text-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
            (m.username);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide" },
                ...{ class: (m.role === 'captain'
                        ? 'border border-amber-400/40 bg-amber-500/15 text-amber-200'
                        : 'border border-cyan-400/35 bg-cyan-500/10 text-cyan-200') },
            });
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
            (m.role === 'captain' ? 'капитан' : 'участник');
            // @ts-ignore
            [sortedMembers, sortedMembers,];
        }
    }
}
else if (__VLS_ctx.err) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-center font-mono text-rose-400" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-400']} */ ;
    (__VLS_ctx.err);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center py-20" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "loading loading-spinner loading-lg text-cyan-500" },
    });
    /** @type {__VLS_StyleScopedClasses['loading']} */ ;
    /** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
    /** @type {__VLS_StyleScopedClasses['loading-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-500']} */ ;
}
// @ts-ignore
[err, err,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
