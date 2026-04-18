/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { api } from './api/http';
import { useSocket } from './composables/useSocket';
import { useAuthStore } from './stores/auth';
const auth = useAuthStore();
const hackathonEnded = ref(false);
const { ensureConnected } = useSocket();
const tgBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HackSwipeBot';
let pollTimer = null;
let onHackathonEnded;
let onRatingUpdated;
async function pollDeadline() {
    try {
        const { data } = await api.get('/api/timer/');
        if (data.deadline_passed)
            hackathonEnded.value = true;
    }
    catch {
        /* гость / офлайн */
    }
}
async function openTelegramBind() {
    try {
        const { data } = await api.post('/api/telegram/deeplink');
        window.open(data.url, '_blank', 'noopener,noreferrer');
    }
    catch {
        /* */
    }
}
onMounted(() => {
    void auth.fetchMe();
    void pollDeadline();
    pollTimer = setInterval(pollDeadline, 8000);
    const s = ensureConnected();
    onHackathonEnded = () => {
        hackathonEnded.value = true;
    };
    onRatingUpdated = (payload) => {
        if (payload &&
            typeof payload === 'object' &&
            payload.hackathon_ended) {
            hackathonEnded.value = true;
        }
    };
    s.on('hackathon_ended', onHackathonEnded);
    s.on('rating_updated', onRatingUpdated);
});
onUnmounted(() => {
    if (pollTimer)
        clearInterval(pollTimer);
    const s = ensureConnected();
    if (onHackathonEnded)
        s.off('hackathon_ended', onHackathonEnded);
    if (onRatingUpdated)
        s.off('rating_updated', onRatingUpdated);
});
const logoTo = computed(() => (auth.role === 'admin' ? '/admin' : '/'));
const navMain = computed(() => [
    { to: '/leaderboard', label: 'Лидерборд' },
    { to: '/podium', label: 'Подиум' },
    { to: '/cases', label: 'Кейсы' },
    { to: '/timer', label: 'Таймер' },
]);
const navGuest = computed(() => auth.user ? [] : [
    { to: '/login', label: 'sign in' },
    { to: '/register', label: 'register' },
]);
const showSympathy = computed(() => !!auth.user && ['participant', 'admin', 'expert'].includes(auth.role || ''));
const showJuryDeck = computed(() => auth.role === 'expert');
const teamMenu = computed(() => {
    if (!auth.user || !['participant', 'admin', 'expert'].includes(auth.role || '')) {
        return [];
    }
    const r = auth.role;
    return [
        { to: '/team/profile', label: r === 'participant' ? 'Моя команда' : 'Профиль' },
        { to: '/team/breakdown', label: 'Разбор баллов' },
        { to: '/team/chat', label: 'Чат команды' },
    ];
});
const adminMenu = computed(() => {
    if (auth.role !== 'admin')
        return [];
    return [
        { to: '/admin', label: 'Панель' },
        { to: '/admin/teams', label: 'Команды' },
        { to: '/admin/cases', label: 'Кейсы' },
        { to: '/admin/criteria', label: 'Критерии' },
        { to: '/admin/users', label: 'Пользователи' },
        { to: '/admin/telegram-console', label: 'TG консоль' },
    ];
});
function closeDetails(ev) {
    const el = ev.currentTarget?.closest('details');
    if (el) {
        el.removeAttribute('open');
    }
}
async function onLogout() {
    await auth.logout();
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-details']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    'data-theme': "dark",
    ...{ class: "hs-grid-bg min-h-screen" },
});
/** @type {__VLS_StyleScopedClasses['hs-grid-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "sticky top-0 z-50 border-b border-cyan-500/10 bg-slate-950/90 backdrop-blur-md" },
});
/** @type {__VLS_StyleScopedClasses['sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-cyan-500/10']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-950/90']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:px-4 md:px-5" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-x-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['md:px-5']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: (__VLS_ctx.logoTo),
    ...{ class: "group flex shrink-0 items-center gap-2 font-mono text-base font-bold tracking-tight text-slate-100 sm:text-lg" },
}));
const __VLS_2 = __VLS_1({
    to: (__VLS_ctx.logoTo),
    ...{ class: "group flex shrink-0 items-center gap-2 font-mono text-base font-bold tracking-tight text-slate-100 sm:text-lg" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-lg']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition group-hover:shadow-cyan-400/40 sm:h-9 sm:w-9" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-cyan-400']} */ ;
/** @type {__VLS_StyleScopedClasses['to-emerald-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-950']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-cyan-500/20']} */ ;
/** @type {__VLS_StyleScopedClasses['transition']} */ ;
/** @type {__VLS_StyleScopedClasses['group-hover:shadow-cyan-400/40']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:w-9']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "truncate" },
});
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-cyan-400" },
});
/** @type {__VLS_StyleScopedClasses['text-cyan-400']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-emerald-400" },
});
/** @type {__VLS_StyleScopedClasses['text-emerald-400']} */ ;
// @ts-ignore
[logoTo,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-1.5" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-x-1']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:gap-x-1.5']} */ ;
if (__VLS_ctx.auth.role === 'admin') {
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        to: "/jury/teams",
        ...{ class: "shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-300/40 transition hover:brightness-110 sm:px-3.5 sm:text-xs" },
        activeClass: "!ring-amber-200 !brightness-110",
    }));
    const __VLS_8 = __VLS_7({
        to: "/jury/teams",
        ...{ class: "shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-300/40 transition hover:brightness-110 sm:px-3.5 sm:text-xs" },
        activeClass: "!ring-amber-200 !brightness-110",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-amber-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-rose-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-amber-900/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-amber-300/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:brightness-110']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
    // @ts-ignore
    [auth,];
    var __VLS_9;
}
if (__VLS_ctx.showJuryDeck) {
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        to: "/jury/teams",
        ...{ class: "shrink-0 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/35 hover:text-cyan-200 sm:px-3 sm:text-xs" },
        activeClass: "!border-cyan-500/40 !bg-cyan-500/10 !text-cyan-200",
    }));
    const __VLS_14 = __VLS_13({
        to: "/jury/teams",
        ...{ class: "shrink-0 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/35 hover:text-cyan-200 sm:px-3 sm:text-xs" },
        activeClass: "!border-cyan-500/40 !bg-cyan-500/10 !text-cyan-200",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-cyan-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_17 } = __VLS_15.slots;
    // @ts-ignore
    [showJuryDeck,];
    var __VLS_15;
}
for (const [l] of __VLS_vFor((__VLS_ctx.navMain))) {
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        key: (l.to),
        to: (l.to),
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs" },
        activeClass: "!bg-cyan-500/15 !text-cyan-300 ring-1 ring-cyan-500/30",
    }));
    const __VLS_20 = __VLS_19({
        key: (l.to),
        to: (l.to),
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs" },
        activeClass: "!bg-cyan-500/15 !text-cyan-300 ring-1 ring-cyan-500/30",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-cyan-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_23 } = __VLS_21.slots;
    (l.label);
    // @ts-ignore
    [navMain,];
    var __VLS_21;
    // @ts-ignore
    [];
}
for (const [l] of __VLS_vFor((__VLS_ctx.navGuest))) {
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        to: (l.to),
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] text-slate-400 hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs" },
        key: (l.to),
    }));
    const __VLS_26 = __VLS_25({
        to: (l.to),
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] text-slate-400 hover:bg-white/5 hover:text-cyan-300 sm:px-3 sm:text-xs" },
        key: (l.to),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-cyan-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_29 } = __VLS_27.slots;
    (l.label);
    // @ts-ignore
    [navGuest,];
    var __VLS_27;
    // @ts-ignore
    [];
}
if (__VLS_ctx.showSympathy) {
    let __VLS_30;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        to: "/sympathy",
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-violet-300/90 ring-1 ring-violet-500/25 transition hover:bg-violet-500/10 sm:px-3 sm:text-xs" },
        activeClass: "!bg-violet-500/20 !ring-violet-400/50",
    }));
    const __VLS_32 = __VLS_31({
        to: "/sympathy",
        ...{ class: "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-violet-300/90 ring-1 ring-violet-500/25 transition hover:bg-violet-500/10 sm:px-3 sm:text-xs" },
        activeClass: "!bg-violet-500/20 !ring-violet-400/50",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-violet-300/90']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-violet-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-violet-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_35 } = __VLS_33.slots;
    // @ts-ignore
    [showSympathy,];
    var __VLS_33;
}
if (__VLS_ctx.auth.role === 'admin') {
    let __VLS_36;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        to: "/admin/telegram-console",
        ...{ class: "shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] text-sky-200/95 transition hover:bg-sky-500/20 sm:px-3 sm:text-xs" },
        title: "Обзор для админа + ссылка на бота",
    }));
    const __VLS_38 = __VLS_37({
        to: "/admin/telegram-console",
        ...{ class: "shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] text-sky-200/95 transition hover:bg-sky-500/20 sm:px-3 sm:text-xs" },
        title: "Обзор для админа + ссылка на бота",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-sky-500/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-sky-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sky-200/95']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-sky-500/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    const { default: __VLS_41 } = __VLS_39.slots;
    // @ts-ignore
    [auth,];
    var __VLS_39;
}
if (__VLS_ctx.auth.user) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.openTelegramBind) },
        type: "button",
        ...{ class: "shrink-0 rounded-full border border-sky-400/25 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-sky-300/95 hover:bg-sky-500/15 sm:px-3 sm:text-xs" },
        title: "Привязать аккаунт для уведомлений о таймере",
    });
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-sky-400/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sky-300/95']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-sky-500/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
}
if (__VLS_ctx.teamMenu.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.details, __VLS_intrinsics.details)({
        ...{ class: "nav-details group relative" },
    });
    /** @type {__VLS_StyleScopedClasses['nav-details']} */ ;
    /** @type {__VLS_StyleScopedClasses['group']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.summary, __VLS_intrinsics.summary)({
        ...{ class: "flex cursor-pointer list-none items-center gap-0.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-white/20 hover:text-slate-100 sm:px-3 sm:text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['list-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-white/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-slate-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[9px] text-slate-500 transition group-open:rotate-180" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['group-open:rotate-180']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute right-0 top-[calc(100%+0.35rem)] z-[100] min-w-[11.5rem] rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-xl ring-1 ring-black/40 backdrop-blur-md" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-[calc(100%+0.35rem)]']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[100]']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-[11.5rem]']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-950/95']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-black/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.teamMenu))) {
        let __VLS_42;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            ...{ 'onClick': {} },
            key: (t.to),
            to: (t.to),
            ...{ class: "block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-white/5 hover:text-cyan-200" },
            activeClass: "!bg-cyan-500/10 !text-cyan-200",
        }));
        const __VLS_44 = __VLS_43({
            ...{ 'onClick': {} },
            key: (t.to),
            to: (t.to),
            ...{ class: "block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-white/5 hover:text-cyan-200" },
            activeClass: "!bg-cyan-500/10 !text-cyan-200",
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        let __VLS_47;
        const __VLS_48 = ({ click: {} },
            { onClick: (__VLS_ctx.closeDetails) });
        /** @type {__VLS_StyleScopedClasses['block']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-white/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-cyan-200']} */ ;
        const { default: __VLS_49 } = __VLS_45.slots;
        (t.label);
        // @ts-ignore
        [auth, openTelegramBind, teamMenu, teamMenu, closeDetails,];
        var __VLS_45;
        var __VLS_46;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.adminMenu.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.details, __VLS_intrinsics.details)({
        ...{ class: "nav-details group relative" },
    });
    /** @type {__VLS_StyleScopedClasses['nav-details']} */ ;
    /** @type {__VLS_StyleScopedClasses['group']} */ ;
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.summary, __VLS_intrinsics.summary)({
        ...{ class: "flex cursor-pointer list-none items-center gap-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-200/90 hover:border-amber-400/40 sm:px-3 sm:text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['list-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-200/90']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-amber-400/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[9px] text-amber-400/70 transition group-open:rotate-180" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-400/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['group-open:rotate-180']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "absolute right-0 top-[calc(100%+0.35rem)] z-[100] min-w-[11.5rem] rounded-xl border border-amber-500/20 bg-slate-950/95 py-1 shadow-xl ring-1 ring-black/40 backdrop-blur-md" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-[calc(100%+0.35rem)]']} */ ;
    /** @type {__VLS_StyleScopedClasses['z-[100]']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-w-[11.5rem]']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-amber-500/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-950/95']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-black/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
    for (const [a] of __VLS_vFor((__VLS_ctx.adminMenu))) {
        let __VLS_50;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
            ...{ 'onClick': {} },
            key: (a.to),
            to: (a.to),
            ...{ class: "block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-amber-500/10 hover:text-amber-100" },
            activeClass: "!bg-amber-500/15 !text-amber-100",
        }));
        const __VLS_52 = __VLS_51({
            ...{ 'onClick': {} },
            key: (a.to),
            to: (a.to),
            ...{ class: "block px-3 py-2 font-mono text-xs text-slate-300 hover:bg-amber-500/10 hover:text-amber-100" },
            activeClass: "!bg-amber-500/15 !text-amber-100",
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        let __VLS_55;
        const __VLS_56 = ({ click: {} },
            { onClick: (__VLS_ctx.closeDetails) });
        /** @type {__VLS_StyleScopedClasses['block']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-amber-100']} */ ;
        const { default: __VLS_57 } = __VLS_53.slots;
        (a.label);
        // @ts-ignore
        [closeDetails, adminMenu, adminMenu,];
        var __VLS_53;
        var __VLS_54;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.auth.user) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.onLogout) },
        type: "button",
        ...{ class: "shrink-0 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-mono text-[11px] text-rose-300/90 hover:bg-rose-500/20 sm:text-xs" },
        title: (`sign out (${__VLS_ctx.auth.user.username})`),
    });
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-rose-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-rose-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-300/90']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-rose-500/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "hidden sm:inline" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:inline']} */ ;
    (__VLS_ctx.auth.user.username);
}
if (__VLS_ctx.hackathonEnded) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-b border-amber-500/35 bg-gradient-to-r from-amber-950/80 via-slate-950/90 to-amber-950/80 px-4 py-2.5 text-center shadow-lg shadow-amber-900/20" },
    });
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-amber-500/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-amber-950/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-slate-950/90']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-amber-950/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-amber-900/20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-mono text-xs font-medium text-amber-100" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "mx-auto max-w-7xl px-3 py-8 pb-20 sm:px-5 sm:py-10 md:px-6" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-8']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-20']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-5']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:py-10']} */ ;
/** @type {__VLS_StyleScopedClasses['md:px-6']} */ ;
let __VLS_58;
/** @ts-ignore @type {typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({}));
const __VLS_60 = __VLS_59({}, ...__VLS_functionalComponentArgsRest(__VLS_59));
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
    ...{ class: "border-t border-white/5 py-6 text-center font-mono text-[10px] text-slate-600" },
});
/** @type {__VLS_StyleScopedClasses['border-t']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white/5']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: (`https://t.me/${__VLS_ctx.tgBotUsername}`),
    target: "_blank",
    rel: "noopener noreferrer",
    ...{ class: "text-sky-500/90 underline-offset-2 hover:text-sky-400 hover:underline" },
});
/** @type {__VLS_StyleScopedClasses['text-sky-500/90']} */ ;
/** @type {__VLS_StyleScopedClasses['underline-offset-2']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-sky-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
// @ts-ignore
[auth, auth, auth, onLogout, hackathonEnded, tgBotUsername,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
