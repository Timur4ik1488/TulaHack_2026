/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { api } from '../api/http';
import { useSocket } from '../composables/useSocket';
import { useResolvedTeamId } from '../composables/useResolvedTeamId';
import { useAuthStore } from '../stores/auth';
import { onTeamPhotoError, teamPhotoSrc } from '../composables/useTeamPhotoFallback';
const messages = ref([]);
const text = ref('');
const sendErr = ref('');
const auth = useAuthStore();
const { teamId, err, teamsList, resolving, resolve, selectTeam, isStaff } = useResolvedTeamId({
    syncQueryWhenStaffDefaults: true,
});
const teamIdNum = computed(() => teamId.value ?? NaN);
const staff = computed(() => isStaff());
const myId = computed(() => auth.user?.id ?? '');
const { ensureConnected } = useSocket();
async function loadMessages() {
    if (!Number.isFinite(teamIdNum.value))
        return;
    sendErr.value = '';
    const { data } = await api.get(`/api/chat/${teamIdNum.value}`);
    messages.value = data.map((row) => ({
        ...row,
        author_username: row.author_username ?? '?',
        author_role_label: row.author_role_label ?? '—',
    }));
}
async function send() {
    if (!text.value.trim() || !Number.isFinite(teamIdNum.value))
        return;
    try {
        await api.post('/api/chat/', { team_id: teamIdNum.value, text: text.value.trim() });
        text.value = '';
        await loadMessages();
    }
    catch {
        sendErr.value = 'Не удалось отправить сообщение.';
    }
}
function setupSocket() {
    if (!Number.isFinite(teamIdNum.value))
        return;
    const s = ensureConnected();
    s.emit('join_team_chat', { team_id: teamIdNum.value });
    s.on('new_message', (raw) => {
        const payload = {
            ...raw,
            author_username: raw.author_username ?? '?',
            author_role_label: raw.author_role_label ?? '—',
        };
        if (payload.team_id !== teamIdNum.value)
            return;
        if (messages.value.some((m) => m.id === payload.id))
            return;
        messages.value = [...messages.value, payload].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
}
onMounted(async () => {
    await resolve();
    await loadMessages();
    setupSocket();
});
watch(teamIdNum, async () => {
    const s = ensureConnected();
    s.off('new_message');
    await loadMessages();
    setupSocket();
});
onUnmounted(() => {
    const s = ensureConnected();
    s.off('new_message');
});
function isMine(m) {
    return String(m.author_id) === String(myId.value);
}
function rolePillClass(label, mine) {
    const base = mine ? 'ring-white/25' : 'ring-white/10';
    if (label === 'капитан')
        return `${base} border border-amber-400/50 bg-amber-500/25 text-amber-50`;
    if (label === 'жюри')
        return `${base} border border-cyan-400/45 bg-cyan-500/20 text-cyan-50`;
    if (label === 'админ')
        return `${base} border border-rose-400/45 bg-rose-500/20 text-rose-50`;
    return `${base} border border-emerald-400/35 bg-emerald-500/15 text-emerald-50`;
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mx-auto flex max-w-3xl flex-col gap-6" },
});
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "bg-gradient-to-r from-cyan-200 via-white to-rose-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent" },
});
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-cyan-200']} */ ;
/** @type {__VLS_StyleScopedClasses['via-white']} */ ;
/** @type {__VLS_StyleScopedClasses['to-rose-200']} */ ;
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
(__VLS_ctx.staff ? 'Выберите команду сверху — переписка внутри карточки.' : 'Сообщения вашей команды.');
if (__VLS_ctx.err) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100" },
    });
    /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-amber-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
    (__VLS_ctx.err);
}
if (!__VLS_ctx.err && __VLS_ctx.staff && __VLS_ctx.teamsList.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "-mx-1 flex gap-3 overflow-x-auto pb-1" },
    });
    /** @type {__VLS_StyleScopedClasses['-mx-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['pb-1']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.teamsList))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.err && __VLS_ctx.staff && __VLS_ctx.teamsList.length))
                        return;
                    __VLS_ctx.selectTeam(t.id);
                    // @ts-ignore
                    [staff, staff, err, err, err, teamsList, teamsList, selectTeam,];
                } },
            key: (t.id),
            type: "button",
            ...{ class: "group relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl border transition" },
            ...{ class: (t.id === __VLS_ctx.teamId
                    ? 'border-cyan-400/60 ring-2 ring-cyan-400/25'
                    : 'border-white/10 hover:border-cyan-300/30') },
        });
        /** @type {__VLS_StyleScopedClasses['group']} */ ;
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-32']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            ...{ onError: (__VLS_ctx.onTeamPhotoError) },
            src: (__VLS_ctx.teamPhotoSrc(t.photo_url)),
            alt: (t.name),
            ...{ class: "absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        /** @type {__VLS_StyleScopedClasses['group-hover:scale-105']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-t']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-black']} */ ;
        /** @type {__VLS_StyleScopedClasses['via-black/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-transparent']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "absolute bottom-2 left-1.5 right-1.5 truncate text-left text-[11px] font-semibold text-white" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['bottom-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['left-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
        (t.name);
        // @ts-ignore
        [teamId, onTeamPhotoError, teamPhotoSrc,];
    }
}
if (!__VLS_ctx.err && Number.isFinite(__VLS_ctx.teamIdNum)) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex max-h-[min(680px,78vh)] min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md hs-glow-merge" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-h-[min(680px,78vh)]']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-[360px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
    /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['hs-glow-merge']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-b border-white/5 bg-gradient-to-r from-cyan-500/10 via-transparent to-rose-500/10 px-4 py-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-cyan-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['via-transparent']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-rose-500/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "font-mono text-[10px] uppercase tracking-wider text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "truncate text-sm font-semibold text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    (__VLS_ctx.teamIdNum);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex-1 space-y-3 overflow-y-auto px-3 py-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-4']} */ ;
    if (__VLS_ctx.sendErr) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-center font-mono text-xs text-rose-400" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-rose-400']} */ ;
        (__VLS_ctx.sendErr);
    }
    for (const [m] of __VLS_vFor((__VLS_ctx.messages))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (m.id),
            ...{ class: "flex" },
            ...{ class: (__VLS_ctx.isMine(m) ? 'justify-end' : 'justify-start') },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-lg" },
            ...{ class: (__VLS_ctx.isMine(m)
                    ? 'rounded-br-md bg-gradient-to-br from-cyan-600 to-emerald-700 text-white'
                    : 'rounded-bl-md border border-white/10 bg-slate-800/95 text-slate-100') },
        });
        /** @type {__VLS_StyleScopedClasses['max-w-[88%]']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-1.5 flex flex-wrap items-center gap-1.5" },
            ...{ class: (__VLS_ctx.isMine(m) ? 'flex-row-reverse justify-end' : '') },
        });
        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "truncate text-[13px] font-semibold tracking-tight" },
        });
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[13px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
        (m.author_username);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide" },
            ...{ class: (__VLS_ctx.rolePillClass(m.author_role_label, __VLS_ctx.isMine(m))) },
        });
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
        (m.author_role_label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "whitespace-pre-wrap leading-relaxed" },
        });
        /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        (m.text);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1.5 font-mono text-[10px] opacity-55" },
            ...{ class: (__VLS_ctx.isMine(m) ? 'text-right' : 'text-left') },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['opacity-55']} */ ;
        (m.created_at);
        // @ts-ignore
        [err, teamIdNum, teamIdNum, sendErr, sendErr, messages, isMine, isMine, isMine, isMine, isMine, rolePillClass,];
    }
    if (!__VLS_ctx.messages.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "py-12 text-center text-sm text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['py-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-t border-white/5 p-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/5']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "join w-full" },
    });
    /** @type {__VLS_StyleScopedClasses['join']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onKeyup: (__VLS_ctx.send) },
        ...{ class: "input join-item flex-1 border-white/10 bg-black/30 font-sans text-sm focus:border-cyan-500/40" },
        placeholder: "Сообщение…",
    });
    (__VLS_ctx.text);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    /** @type {__VLS_StyleScopedClasses['join-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-sans']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['focus:border-cyan-500/40']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.send) },
        type: "button",
        ...{ class: "btn join-item border-0 bg-gradient-to-r from-rose-500 to-amber-500 font-mono text-xs text-white hover:opacity-95" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['join-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
    /** @type {__VLS_StyleScopedClasses['from-rose-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['to-amber-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:opacity-95']} */ ;
}
else if (__VLS_ctx.resolving) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex justify-center py-20" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-20']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "loading loading-spinner loading-lg text-cyan-400" },
    });
    /** @type {__VLS_StyleScopedClasses['loading']} */ ;
    /** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
    /** @type {__VLS_StyleScopedClasses['loading-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-400']} */ ;
}
// @ts-ignore
[messages, send, send, text, resolving,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
