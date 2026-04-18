/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
import { onTeamPhotoError, onUserAvatarError, teamPhotoSrc, userAvatarSrc } from '../composables/useTeamPhotoFallback';
import { apiErrorMessage } from '../utils/apiErrorMessage';
const auth = useAuthStore();
const summary = ref(null);
const err = ref('');
const busy = ref(false);
const briefDesc = ref('');
const briefRepo = ref('');
const briefShots = ref('');
const briefSolution = ref('');
const submissionOpen = ref(true);
const joinCode = ref('');
const photoMsg = ref('');
const avatarBusy = ref(false);
const avatarMsg = ref('');
const inviteCopied = ref(false);
let inviteCopyTimer = null;
const isStaff = computed(() => auth.role === 'admin' || auth.role === 'expert');
const isParticipant = computed(() => auth.role === 'participant');
const tgBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HackSwipeBot';
let timerPoll = null;
async function pollSubmissionWindow() {
    try {
        const { data } = await api.get('/api/timer/');
        submissionOpen.value = data.submission_window_open !== false;
    }
    catch {
        /* */
    }
}
async function openTelegramBind() {
    try {
        const { data } = await api.post('/api/telegram/deeplink');
        window.open(data.url, '_blank', 'noopener,noreferrer');
    }
    catch {
        photoMsg.value = 'Не удалось получить ссылку на бота (войдите заново?)';
    }
}
function accountRoleLabel(role) {
    if (!role)
        return '';
    if (role === 'admin')
        return 'admin';
    if (role === 'expert')
        return 'Жюри';
    if (role === 'participant')
        return 'Участник';
    return role;
}
const teamId = computed(() => summary.value?.team.id ?? NaN);
const isCaptain = computed(() => summary.value?.my_role === 'captain');
async function onUserAvatarChange(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file)
        return;
    avatarBusy.value = true;
    avatarMsg.value = '';
    try {
        const fd = new FormData();
        fd.append('file', file);
        await api.post('/api/users/me/avatar', fd);
        await auth.fetchMe();
        avatarMsg.value = 'Аватар обновлён';
    }
    catch (e) {
        avatarMsg.value = apiErrorMessage(e, 'Не удалось загрузить аватар');
    }
    finally {
        avatarBusy.value = false;
    }
}
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
const shotUrls = computed(() => parseShots(summary.value?.team.screenshots_json ?? null));
const repoCard = computed(() => {
    const raw = summary.value?.team.repo_url?.trim();
    if (!raw)
        return null;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.replace(/^www\./, '');
        const pathRaw = (parsed.pathname + parsed.search).replace(/\/+$/, '') || '/';
        const pathShort = pathRaw.length > 56 ? `${pathRaw.slice(0, 53)}…` : pathRaw;
        let brand = 'Репозиторий';
        if (host.includes('github'))
            brand = 'GitHub';
        else if (host.includes('gitlab'))
            brand = 'GitLab';
        else if (host.includes('bitbucket'))
            brand = 'Bitbucket';
        return { href: parsed.href, host, pathShort, brand };
    }
    catch {
        return {
            href: normalized,
            host: '',
            pathShort: raw.length > 64 ? `${raw.slice(0, 61)}…` : raw,
            brand: 'Ссылка',
        };
    }
});
function isLikelyImageUrl(u) {
    return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(u.trim());
}
async function copyInviteCode() {
    const code = summary.value?.invite_code;
    if (!code)
        return;
    try {
        await navigator.clipboard.writeText(code);
        inviteCopied.value = true;
        if (inviteCopyTimer)
            clearTimeout(inviteCopyTimer);
        inviteCopyTimer = setTimeout(() => {
            inviteCopied.value = false;
        }, 2000);
    }
    catch {
        photoMsg.value = 'Не удалось скопировать — выделите код вручную';
    }
}
async function load() {
    err.value = '';
    summary.value = null;
    try {
        const { data } = await api.get('/api/teams/my/summary');
        summary.value = data;
        briefDesc.value = data.team.description ?? '';
        briefRepo.value = data.team.repo_url ?? '';
        briefShots.value = parseShots(data.team.screenshots_json).join('\n');
        briefSolution.value = data.team.solution_submission_url ?? '';
    }
    catch {
        err.value = 'Вы не в команде. Зарегистрируйтесь с инвайтом или создайте команду.';
    }
}
async function saveBrief() {
    if (!summary.value || !isCaptain.value)
        return;
    busy.value = true;
    photoMsg.value = '';
    try {
        const urls = briefShots.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
        await api.patch(`/api/teams/${summary.value.team.id}/brief`, {
            description: briefDesc.value || null,
            repo_url: briefRepo.value || null,
            screenshots_urls: urls,
            solution_submission_url: briefSolution.value.trim() || null,
        });
        await load();
        photoMsg.value = 'Материалы для жюри сохранены';
    }
    catch (e) {
        photoMsg.value = apiErrorMessage(e, 'Не удалось сохранить материалы');
    }
    finally {
        busy.value = false;
    }
}
async function onPhotoChange(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !summary.value)
        return;
    busy.value = true;
    photoMsg.value = '';
    try {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/api/teams/${summary.value.team.id}/photo`, fd);
        await load();
        photoMsg.value = 'Фото команды обновлено';
    }
    catch (e) {
        photoMsg.value = apiErrorMessage(e, 'Ошибка загрузки фото команды');
    }
    finally {
        busy.value = false;
    }
}
async function joinByInvite() {
    busy.value = true;
    photoMsg.value = '';
    try {
        const { data } = await api.post('/api/teams/join-by-invite', {
            invite_code: joinCode.value.trim(),
        });
        summary.value = data;
        joinCode.value = '';
        err.value = '';
        briefDesc.value = data.team.description ?? '';
        briefRepo.value = data.team.repo_url ?? '';
        briefShots.value = parseShots(data.team.screenshots_json).join('\n');
        briefSolution.value = data.team.solution_submission_url ?? '';
        photoMsg.value = 'Вы в команде';
    }
    catch (e) {
        photoMsg.value = apiErrorMessage(e, 'Не удалось вступить по коду');
    }
    finally {
        busy.value = false;
    }
}
onMounted(() => {
    if (isParticipant.value) {
        void load();
        void pollSubmissionWindow();
        timerPoll = setInterval(pollSubmissionWindow, 10000);
    }
});
onUnmounted(() => {
    if (inviteCopyTimer)
        clearTimeout(inviteCopyTimer);
    if (timerPoll)
        clearInterval(timerPoll);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto max-w-3xl" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
if (__VLS_ctx.isStaff && __VLS_ctx.auth.user) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-8 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-2 font-mono text-xs text-rose-400/80" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-rose-400/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "bg-gradient-to-r from-rose-200 via-amber-100 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-rose-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-amber-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-cyan-200']} */ ;
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
        ...{ class: "overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-skip" },
    });
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['hs-glow-skip']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative h-36 bg-gradient-to-br from-rose-500 via-amber-500 to-cyan-500" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-36']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-rose-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-amber-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-cyan-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative -mt-14 px-6 pb-8" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['-mt-14']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-8']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-slate-950 shadow-xl ring-2 ring-rose-400/30" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-28']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-28']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-slate-950']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['ring-rose-400/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        ...{ onError: (__VLS_ctx.onUserAvatarError) },
        src: (__VLS_ctx.userAvatarSrc(__VLS_ctx.auth.user.avatar_url)),
        alt: "",
        ...{ class: "h-full w-full object-cover" },
    });
    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "mt-4 text-2xl font-bold text-white" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    (__VLS_ctx.auth.user.username);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-slate-400" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    (__VLS_ctx.auth.user.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mt-3 inline-flex rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider" },
        ...{ class: (__VLS_ctx.auth.user.role === 'admin'
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200') },
    });
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.accountRoleLabel(__VLS_ctx.auth.user.role));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-4" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.onUserAvatarChange) },
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        ...{ class: "mt-1 block max-w-xs text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2 file:py-1 file:font-mono file:text-slate-200" },
        disabled: (__VLS_ctx.avatarBusy),
    });
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['block']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:mr-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:border-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:bg-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['file:text-slate-200']} */ ;
    if (__VLS_ctx.avatarMsg) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1 font-mono text-[11px] text-cyan-400/90" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-400/90']} */ ;
        (__VLS_ctx.avatarMsg);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid gap-3 border-t border-white/5 px-6 pb-8 sm:grid-cols-2" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        to: "/sympathy",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-violet-400/35 hover:bg-violet-500/10" },
    }));
    const __VLS_2 = __VLS_1({
        to: "/sympathy",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-violet-400/35 hover:bg-violet-500/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-violet-400/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-violet-500/10']} */ ;
    const { default: __VLS_5 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-violet-300" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-violet-300']} */ ;
    // @ts-ignore
    [isStaff, auth, auth, auth, auth, auth, auth, onUserAvatarError, userAvatarSrc, accountRoleLabel, onUserAvatarChange, avatarBusy, avatarMsg, avatarMsg,];
    var __VLS_3;
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        to: "/jury/teams",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10" },
    }));
    const __VLS_8 = __VLS_7({
        to: "/jury/teams",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-cyan-400/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/10']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-cyan-300" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-300']} */ ;
    // @ts-ignore
    [];
    var __VLS_9;
    let __VLS_12;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        to: "/team/breakdown",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-amber-400/35 hover:bg-amber-500/10" },
    }));
    const __VLS_14 = __VLS_13({
        to: "/team/breakdown",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-amber-400/35 hover:bg-amber-500/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-amber-400/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/10']} */ ;
    const { default: __VLS_17 } = __VLS_15.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-amber-200" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-200']} */ ;
    // @ts-ignore
    [];
    var __VLS_15;
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        to: "/team/chat",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/35 hover:bg-emerald-500/10" },
    }));
    const __VLS_20 = __VLS_19({
        to: "/team/chat",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/35 hover:bg-emerald-500/10" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-emerald-400/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-emerald-500/10']} */ ;
    const { default: __VLS_23 } = __VLS_21.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-emerald-300" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-emerald-300']} */ ;
    // @ts-ignore
    [];
    var __VLS_21;
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        to: "/leaderboard",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20 sm:col-span-2" },
    }));
    const __VLS_26 = __VLS_25({
        to: "/leaderboard",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/20 sm:col-span-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-white/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:col-span-2']} */ ;
    const { default: __VLS_29 } = __VLS_27.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-slate-400" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
    // @ts-ignore
    [];
    var __VLS_27;
    let __VLS_30;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        to: "/cases",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:col-span-2" },
    }));
    const __VLS_32 = __VLS_31({
        to: "/cases",
        ...{ class: "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:col-span-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-cyan-400/35']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:col-span-2']} */ ;
    const { default: __VLS_35 } = __VLS_33.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-cyan-300" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-300']} */ ;
    // @ts-ignore
    [];
    var __VLS_33;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: (`https://t.me/${__VLS_ctx.tgBotUsername}`),
        target: "_blank",
        rel: "noopener noreferrer",
        ...{ class: "flex items-center justify-between rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 transition hover:border-sky-400/40 sm:col-span-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-sky-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-sky-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:border-sky-400/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:col-span-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-sm font-medium text-sky-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sky-100']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "font-mono text-xs text-sky-300" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sky-300']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.openTelegramBind) },
        type: "button",
        ...{ class: "rounded-2xl border border-sky-400/30 bg-black/30 px-4 py-3 text-left text-sm text-sky-100 transition hover:bg-sky-500/15 sm:col-span-2" },
    });
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-sky-400/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sky-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-sky-500/15']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:col-span-2']} */ ;
    if (__VLS_ctx.auth.user.role === 'admin') {
        let __VLS_36;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
            to: "/admin/teams",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }));
        const __VLS_38 = __VLS_37({
            to: "/admin/teams",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/20']} */ ;
        const { default: __VLS_41 } = __VLS_39.slots;
        // @ts-ignore
        [auth, tgBotUsername, openTelegramBind,];
        var __VLS_39;
        let __VLS_42;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            to: "/admin/criteria",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }));
        const __VLS_44 = __VLS_43({
            to: "/admin/criteria",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/20']} */ ;
        const { default: __VLS_47 } = __VLS_45.slots;
        // @ts-ignore
        [];
        var __VLS_45;
        let __VLS_48;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
            to: "/admin/users",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }));
        const __VLS_50 = __VLS_49({
            to: "/admin/users",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/20']} */ ;
        const { default: __VLS_53 } = __VLS_51.slots;
        // @ts-ignore
        [];
        var __VLS_51;
        let __VLS_54;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
            to: "/timer",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }));
        const __VLS_56 = __VLS_55({
            to: "/timer",
            ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-100 transition hover:bg-amber-500/20" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-amber-500/20']} */ ;
        const { default: __VLS_59 } = __VLS_57.slots;
        // @ts-ignore
        [];
        var __VLS_57;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            href: "/ops/grafana/",
            ...{ class: "rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-center text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20" },
        });
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-cyan-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/20']} */ ;
    }
}
else if (__VLS_ctx.isParticipant) {
    if (__VLS_ctx.auth.user) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8 flex flex-wrap items-center gap-4 rounded-3xl border border-cyan-500/15 bg-slate-900/50 p-5 shadow-lg shadow-cyan-950/20 backdrop-blur-md" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-500/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-cyan-950/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            ...{ onError: (__VLS_ctx.onUserAvatarError) },
            src: (__VLS_ctx.userAvatarSrc(__VLS_ctx.auth.user.avatar_url)),
            alt: "",
            ...{ class: "h-16 w-16 shrink-0 rounded-2xl border-2 border-cyan-400/35 object-cover shadow-lg shadow-cyan-900/30 ring-2 ring-cyan-500/15" },
        });
        /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-400/35']} */ ;
        /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-cyan-900/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['ring-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['ring-cyan-500/15']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "min-w-0 flex-1" },
        });
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-[10px] uppercase tracking-wider text-cyan-500/70" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-500/70']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-0.5 text-sm text-slate-400" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onChange: (__VLS_ctx.onUserAvatarChange) },
            type: "file",
            accept: "image/jpeg,image/png,image/webp",
            ...{ class: "mt-2 block max-w-xs text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-cyan-600/80 file:to-emerald-600/80 file:px-3 file:py-1.5 file:font-mono file:text-white" },
            disabled: (__VLS_ctx.avatarBusy),
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['block']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:mr-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:border-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:bg-gradient-to-r']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:from-cyan-600/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:to-emerald-600/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['file:text-white']} */ ;
        if (__VLS_ctx.avatarMsg) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mt-1 font-mono text-[11px] text-emerald-400/90" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-emerald-400/90']} */ ;
            (__VLS_ctx.avatarMsg);
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mb-8 text-center" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-2 font-mono text-xs text-cyan-500/80" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-500/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "bg-gradient-to-r from-cyan-200 via-white to-emerald-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-cyan-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-emerald-200']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-clip-text']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-transparent']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:text-4xl']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mx-auto mt-2 max-w-md text-sm text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    if (__VLS_ctx.err) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8 rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-slate-900/60 p-5 text-sm text-amber-50 shadow-lg backdrop-blur-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/35']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-amber-950/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-slate-900/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mb-4 font-medium" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        (__VLS_ctx.err);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.joinCode),
            type: "text",
            placeholder: "код приглашения",
            ...{ class: "input input-bordered input-sm flex-1 border-white/15 bg-black/40 font-mono text-cyan-100 placeholder:text-slate-600" },
        });
        /** @type {__VLS_StyleScopedClasses['input']} */ ;
        /** @type {__VLS_StyleScopedClasses['input-bordered']} */ ;
        /** @type {__VLS_StyleScopedClasses['input-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/15']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['placeholder:text-slate-600']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.joinByInvite) },
            type: "button",
            ...{ class: "btn shrink-0 border-0 bg-gradient-to-r from-cyan-600 to-emerald-600 font-mono text-slate-950 hover:opacity-95" },
            disabled: (__VLS_ctx.busy || !__VLS_ctx.joinCode.trim()),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-cyan-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-emerald-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-950']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:opacity-95']} */ ;
        let __VLS_60;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
            to: "/register",
            ...{ class: "btn btn-ghost btn-sm shrink-0 border border-white/10 font-mono text-slate-300" },
        }));
        const __VLS_62 = __VLS_61({
            to: "/register",
            ...{ class: "btn btn-ghost btn-sm shrink-0 border border-white/10 font-mono text-slate-300" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
        const { default: __VLS_65 } = __VLS_63.slots;
        // @ts-ignore
        [auth, auth, onUserAvatarError, userAvatarSrc, onUserAvatarChange, avatarBusy, avatarMsg, avatarMsg, isParticipant, err, err, joinCode, joinCode, joinByInvite, busy,];
        var __VLS_63;
    }
    else if (__VLS_ctx.summary) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-6 flex flex-wrap justify-center gap-2 sm:justify-start" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:justify-start']} */ ;
        let __VLS_66;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-md shadow-cyan-950/20 transition hover:border-cyan-400/50 hover:bg-cyan-500/20" },
            to: ({ path: '/team/chat', query: { teamId: String(__VLS_ctx.teamId) } }),
        }));
        const __VLS_68 = __VLS_67({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-md shadow-cyan-950/20 transition hover:border-cyan-400/50 hover:bg-cyan-500/20" },
            to: ({ path: '/team/chat', query: { teamId: String(__VLS_ctx.teamId) } }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-500/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-cyan-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-cyan-950/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-cyan-400/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/20']} */ ;
        const { default: __VLS_71 } = __VLS_69.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-cyan-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-300/90']} */ ;
        // @ts-ignore
        [summary, teamId,];
        var __VLS_69;
        let __VLS_72;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 shadow-md shadow-rose-950/20 transition hover:border-rose-400/45 hover:bg-rose-500/20" },
            to: ({ path: '/team/breakdown', query: { teamId: String(__VLS_ctx.teamId) } }),
        }));
        const __VLS_74 = __VLS_73({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 shadow-md shadow-rose-950/20 transition hover:border-rose-400/45 hover:bg-rose-500/20" },
            to: ({ path: '/team/breakdown', query: { teamId: String(__VLS_ctx.teamId) } }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-rose-500/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-rose-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-rose-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-rose-950/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-rose-400/45']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-rose-500/20']} */ ;
        const { default: __VLS_77 } = __VLS_75.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-rose-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-rose-300/90']} */ ;
        // @ts-ignore
        [teamId,];
        var __VLS_75;
        let __VLS_78;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/10" },
            to: (`/teams/${__VLS_ctx.teamId}`),
        }));
        const __VLS_80 = __VLS_79({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/10" },
            to: (`/teams/${__VLS_ctx.teamId}`),
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-emerald-400/35']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-emerald-500/10']} */ ;
        const { default: __VLS_83 } = __VLS_81.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-emerald-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-emerald-300/90']} */ ;
        // @ts-ignore
        [teamId,];
        var __VLS_81;
        let __VLS_84;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/35 hover:bg-cyan-500/10" },
            to: "/cases",
        }));
        const __VLS_86 = __VLS_85({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/35 hover:bg-cyan-500/10" },
            to: "/cases",
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-white/5']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-cyan-400/35']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/10']} */ ;
        const { default: __VLS_89 } = __VLS_87.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-cyan-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-300/90']} */ ;
        // @ts-ignore
        [];
        var __VLS_87;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-400/45" },
            href: (`https://t.me/${__VLS_ctx.tgBotUsername}`),
            target: "_blank",
            rel: "noopener noreferrer",
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-sky-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-sky-500/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sky-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-sky-400/45']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-sky-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sky-300/90']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.openTelegramBind) },
            type: "button",
            ...{ class: "flex min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-black/30 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-w-[8.5rem]']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-sky-400/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sky-100']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-sky-500/15']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "font-mono text-xs text-sky-300/90" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sky-300/90']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/55 shadow-2xl shadow-cyan-950/25 backdrop-blur-md hs-glow-merge" },
        });
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-500/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-slate-900/55']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-cyan-950/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
        /** @type {__VLS_StyleScopedClasses['hs-glow-merge']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.figure, __VLS_intrinsics.figure)({
            ...{ class: "relative h-48 overflow-hidden sm:h-56" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-48']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:h-56']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            ...{ onError: (__VLS_ctx.onTeamPhotoError) },
            src: (__VLS_ctx.teamPhotoSrc(__VLS_ctx.summary.team.photo_url)),
            alt: (__VLS_ctx.summary.team.name),
            ...{ class: "h-full w-full object-cover" },
        });
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-slate-950']} */ ;
        /** @type {__VLS_StyleScopedClasses['via-slate-950/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-transparent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/15" },
        });
        /** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-cyan-500/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['via-transparent']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-emerald-500/15']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "relative -mt-10 px-5 pb-8 pt-0 sm:-mt-12 sm:px-8" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['-mt-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['pb-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:-mt-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:px-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:items-end']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "min-w-0" },
        });
        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['drop-shadow']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:text-3xl']} */ ;
        (__VLS_ctx.summary.team.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "mt-2 inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide" },
            ...{ class: (__VLS_ctx.summary.my_role === 'captain'
                    ? 'border-amber-400/45 bg-amber-500/15 text-amber-100'
                    : 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100') },
        });
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
        (__VLS_ctx.summary.my_role === 'captain' ? 'Вы — капитан' : 'Участник команды');
        if (__VLS_ctx.summary.invite_code) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "w-full shrink-0 rounded-2xl border border-cyan-500/35 bg-slate-950/70 p-4 shadow-inner shadow-black/40 sm:max-w-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-cyan-500/35']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-950/70']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['shadow-inner']} */ ;
            /** @type {__VLS_StyleScopedClasses['shadow-black/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:max-w-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "font-mono text-[10px] uppercase tracking-wider text-cyan-500/80" },
            });
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-500/80']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-2 flex flex-wrap items-center gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({
                ...{ class: "select-all flex-1 break-all font-mono text-lg font-semibold tracking-wider text-cyan-200" },
            });
            /** @type {__VLS_StyleScopedClasses['select-all']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['break-all']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-200']} */ ;
            (__VLS_ctx.summary.invite_code);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.copyInviteCode) },
                type: "button",
                ...{ class: "rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-xs text-cyan-100 transition hover:bg-cyan-500/25" },
            });
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-cyan-500/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-cyan-500/15']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/25']} */ ;
            if (__VLS_ctx.inviteCopied) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "mt-2 font-mono text-[11px] text-emerald-400" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-emerald-400']} */ ;
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-300" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
        (__VLS_ctx.summary.team.members);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1.5 text-sm text-slate-300" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
        (__VLS_ctx.summary.team.contact);
        if (__VLS_ctx.repoCard) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                href: (__VLS_ctx.repoCard.href),
                target: "_blank",
                rel: "noopener noreferrer",
                ...{ class: "mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 px-4 py-4 transition hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-900/25" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
            /** @type {__VLS_StyleScopedClasses['from-slate-900/90']} */ ;
            /** @type {__VLS_StyleScopedClasses['via-slate-900/70']} */ ;
            /** @type {__VLS_StyleScopedClasses['to-slate-900/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:shadow-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:shadow-cyan-900/25']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/20 text-cyan-200 ring-1 ring-cyan-400/25" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-14']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-14']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
            /** @type {__VLS_StyleScopedClasses['from-cyan-500/25']} */ ;
            /** @type {__VLS_StyleScopedClasses['to-emerald-500/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['ring-cyan-400/25']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-mono text-xl font-bold text-cyan-100" },
            });
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0 flex-1 text-left" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-cyan-400/90']} */ ;
            (__VLS_ctx.repoCard.brand);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "truncate font-mono text-sm text-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
            if (__VLS_ctx.repoCard.host) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                (__VLS_ctx.repoCard.host);
            }
            (__VLS_ctx.repoCard.pathShort);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mt-1 font-mono text-[10px] text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        }
        if (__VLS_ctx.shotUrls.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-6" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mb-3 font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-2 gap-3 sm:grid-cols-3" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:grid-cols-3']} */ ;
            for (const [u, i] of __VLS_vFor((__VLS_ctx.shotUrls))) {
                (i);
                if (__VLS_ctx.isLikelyImageUrl(u)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                        href: (u),
                        target: "_blank",
                        rel: "noopener noreferrer",
                        ...{ class: "group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 shadow-md" },
                    });
                    /** @type {__VLS_StyleScopedClasses['group']} */ ;
                    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
                    /** @type {__VLS_StyleScopedClasses['aspect-video']} */ ;
                    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-950/50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['shadow-md']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                        src: (u),
                        alt: "",
                        ...{ class: "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" },
                    });
                    /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
                    /** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
                    /** @type {__VLS_StyleScopedClasses['group-hover:scale-[1.03]']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 font-mono text-[10px] text-white/90" },
                    });
                    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
                    /** @type {__VLS_StyleScopedClasses['inset-x-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bottom-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-t']} */ ;
                    /** @type {__VLS_StyleScopedClasses['from-black/80']} */ ;
                    /** @type {__VLS_StyleScopedClasses['to-transparent']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                    (i + 1);
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
                        href: (u),
                        target: "_blank",
                        rel: "noopener noreferrer",
                        ...{ class: "flex min-h-[5.5rem] flex-col justify-center rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-center font-mono text-[11px] text-cyan-200/95 transition hover:border-cyan-500/35 hover:bg-cyan-500/10" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['min-h-[5.5rem]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-950/50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-cyan-200/95']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/35']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:bg-cyan-500/10']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-slate-500" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                    (i + 1);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "mt-1 truncate text-cyan-300/90" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-cyan-300/90']} */ ;
                    (u);
                }
                // @ts-ignore
                [tgBotUsername, openTelegramBind, summary, summary, summary, summary, summary, summary, summary, summary, summary, onTeamPhotoError, teamPhotoSrc, copyInviteCode, inviteCopied, repoCard, repoCard, repoCard, repoCard, repoCard, repoCard, shotUrls, shotUrls, isLikelyImageUrl,];
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-8 font-mono text-[10px] uppercase tracking-widest text-cyan-500/75" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-500/75']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "mt-1 text-lg font-semibold text-slate-100" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
            ...{ class: "mt-4 grid gap-3 sm:grid-cols-2" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        for (const [m] of __VLS_vFor((__VLS_ctx.summary.members))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                key: (m.user_id),
                ...{ class: "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3.5 transition hover:border-cyan-500/25" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-950/45']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-3.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:border-cyan-500/25']} */ ;
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
                        ? 'border border-amber-400/45 bg-amber-500/15 text-amber-200'
                        : 'border border-emerald-400/35 bg-emerald-500/10 text-emerald-200') },
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
            [summary,];
        }
        if (__VLS_ctx.isCaptain) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-8 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/25 to-slate-950/40 p-5 sm:p-6" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-amber-500/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
            /** @type {__VLS_StyleScopedClasses['from-amber-950/25']} */ ;
            /** @type {__VLS_StyleScopedClasses['to-slate-950/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:p-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-mono text-sm font-medium text-amber-100/95" },
            });
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-100/95']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mt-1 text-xs text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "mb-1.5 mt-5 block font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                value: (__VLS_ctx.briefDesc),
                ...{ class: "textarea textarea-bordered mb-4 w-full border-white/10 bg-black/35 text-sm text-slate-100 placeholder:text-slate-600" },
                rows: "4",
                placeholder: "Кратко: что делаете, стек, демо…",
            });
            /** @type {__VLS_StyleScopedClasses['textarea']} */ ;
            /** @type {__VLS_StyleScopedClasses['textarea-bordered']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/35']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "url",
                ...{ class: "input input-bordered mb-4 w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100" },
                placeholder: "https://github.com/org/repo",
            });
            (__VLS_ctx.briefRepo);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            /** @type {__VLS_StyleScopedClasses['input-bordered']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/35']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "url",
                ...{ class: "input input-bordered mb-1 w-full border-white/10 bg-black/35 font-mono text-sm text-slate-100" },
                placeholder: "https://…",
                disabled: (!__VLS_ctx.submissionOpen),
            });
            (__VLS_ctx.briefSolution);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            /** @type {__VLS_StyleScopedClasses['input-bordered']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/35']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
            if (!__VLS_ctx.submissionOpen) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "mb-4 font-mono text-[10px] text-amber-400/90" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-amber-400/90']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "mb-4 font-mono text-[10px] text-slate-600" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                value: (__VLS_ctx.briefShots),
                ...{ class: "textarea textarea-bordered mb-4 w-full border-white/10 bg-black/35 font-mono text-xs text-slate-200" },
                rows: "3",
                placeholder: "https://…/shot1.png",
            });
            /** @type {__VLS_StyleScopedClasses['textarea']} */ ;
            /** @type {__VLS_StyleScopedClasses['textarea-bordered']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/35']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-col gap-3 sm:flex-row sm:items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.saveBrief) },
                type: "button",
                ...{ class: "btn border-0 bg-gradient-to-r from-amber-600 to-orange-600 font-mono text-sm text-white hover:opacity-95 disabled:opacity-40" },
                disabled: (__VLS_ctx.busy),
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
            /** @type {__VLS_StyleScopedClasses['from-amber-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['to-orange-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:opacity-95']} */ ;
            /** @type {__VLS_StyleScopedClasses['disabled:opacity-40']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-1 flex-col gap-1 sm:max-w-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:max-w-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.onPhotoChange) },
                type: "file",
                accept: "image/jpeg,image/png,image/webp",
                ...{ class: "text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2 file:py-1 file:font-mono" },
                disabled: (__VLS_ctx.busy),
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:mr-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:border-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:bg-white/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['file:font-mono']} */ ;
        }
        if (__VLS_ctx.photoMsg) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "mt-4 text-center font-mono text-xs text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            (__VLS_ctx.photoMsg);
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-center py-24" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-24']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
            ...{ class: "loading loading-spinner loading-lg text-cyan-500" },
        });
        /** @type {__VLS_StyleScopedClasses['loading']} */ ;
        /** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
        /** @type {__VLS_StyleScopedClasses['loading-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-500']} */ ;
    }
}
// @ts-ignore
[busy, busy, isCaptain, briefDesc, briefRepo, submissionOpen, submissionOpen, briefSolution, briefShots, saveBrief, onPhotoChange, photoMsg, photoMsg,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
