/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/kiric/AppData/Local/npm-cache/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
import { apiErrorMessage } from '../utils/apiErrorMessage';
const route = useRoute();
const auth = useAuthStore();
const detail = ref(null);
const teamsAll = ref([]);
const usersAll = ref([]);
const err = ref('');
const msg = ref('');
const busy = ref(false);
const pickTeamId = ref(0);
const expertPick = ref([]);
const caseId = computed(() => Number(route.params.id));
const canManageTeams = computed(() => {
    if (auth.role === 'admin')
        return true;
    if (auth.role === 'expert' && auth.user && detail.value?.expert_user_ids?.includes(auth.user.id))
        return true;
    return false;
});
const isAdmin = computed(() => auth.role === 'admin');
async function load() {
    err.value = '';
    detail.value = null;
    try {
        const { data } = await api.get(`/api/cases/${caseId.value}`);
        detail.value = data;
        expertPick.value = [...(data.expert_user_ids || [])];
    }
    catch {
        err.value = 'Кейс не найден';
    }
}
async function loadTeams() {
    try {
        const { data } = await api.get('/api/teams/');
        teamsAll.value = data;
    }
    catch {
        teamsAll.value = [];
    }
}
async function loadUsers() {
    if (!isAdmin.value)
        return;
    try {
        const { data } = await api.get('/api/users/');
        usersAll.value = data.filter((u) => u.role === 'expert');
    }
    catch {
        usersAll.value = [];
    }
}
async function assignTeam() {
    if (!detail.value || !pickTeamId.value)
        return;
    busy.value = true;
    msg.value = '';
    try {
        await api.post(`/api/cases/${detail.value.id}/teams`, { team_id: pickTeamId.value });
        await load();
        pickTeamId.value = 0;
        msg.value = 'Команда добавлена к кейсу';
    }
    catch (e) {
        msg.value = apiErrorMessage(e, 'Не удалось добавить команду');
    }
    finally {
        busy.value = false;
    }
}
async function removeTeam(teamId) {
    if (!detail.value)
        return;
    busy.value = true;
    msg.value = '';
    try {
        await api.delete(`/api/cases/${detail.value.id}/teams/${teamId}`);
        await load();
        msg.value = 'Команда откреплена';
    }
    catch (e) {
        msg.value = apiErrorMessage(e, 'Не удалось открепить');
    }
    finally {
        busy.value = false;
    }
}
async function saveExperts() {
    if (!detail.value)
        return;
    busy.value = true;
    msg.value = '';
    try {
        await api.post(`/api/cases/${detail.value.id}/experts`, { user_ids: expertPick.value });
        await load();
        msg.value = 'Эксперты кейса обновлены';
    }
    catch (e) {
        msg.value = apiErrorMessage(e, 'Не удалось сохранить экспертов');
    }
    finally {
        busy.value = false;
    }
}
const expertOptions = computed(() => usersAll.value);
onMounted(async () => {
    await auth.fetchMe();
    await loadTeams();
    await loadUsers();
    await load();
});
watch(caseId, async () => {
    await load();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.detail) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mx-auto max-w-3xl" },
    });
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "mb-2 font-mono text-xs text-amber-400/90" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-amber-400/90']} */ ;
    (__VLS_ctx.detail.ordinal);
    (__VLS_ctx.detail.company_name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "text-3xl font-bold text-slate-100" },
    });
    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
    (__VLS_ctx.detail.title);
    if (__VLS_ctx.detail.description) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-4 whitespace-pre-wrap text-slate-400" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        (__VLS_ctx.detail.description);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "mt-10" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-10']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "mb-3 font-mono text-sm uppercase tracking-wider text-cyan-500/80" },
    });
    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-cyan-500/80']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
        ...{ class: "space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.detail.teams))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (t.team_id),
            ...{ class: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-slate-900/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        let __VLS_0;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            to: (`/teams/${t.team_id}`),
            ...{ class: "font-medium text-cyan-200 hover:underline" },
        }));
        const __VLS_2 = __VLS_1({
            to: (`/teams/${t.team_id}`),
            ...{ class: "font-medium text-cyan-200 hover:underline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-200']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
        const { default: __VLS_5 } = __VLS_3.slots;
        (t.team_name);
        // @ts-ignore
        [detail, detail, detail, detail, detail, detail, detail,];
        var __VLS_3;
        if (__VLS_ctx.canManageTeams) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.detail))
                            return;
                        if (!(__VLS_ctx.canManageTeams))
                            return;
                        __VLS_ctx.removeTeam(t.team_id);
                        // @ts-ignore
                        [canManageTeams, removeTeam,];
                    } },
                type: "button",
                ...{ class: "rounded-lg border border-rose-500/30 px-2 py-1 font-mono text-[11px] text-rose-200 hover:bg-rose-500/15" },
                disabled: (__VLS_ctx.busy),
            });
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-rose-500/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-rose-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-rose-500/15']} */ ;
        }
        // @ts-ignore
        [busy,];
    }
    if (!__VLS_ctx.detail.teams.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "font-mono text-sm text-slate-600" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
    }
    if (__VLS_ctx.canManageTeams) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-8 rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-5" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-cyan-500/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-slate-900/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "font-mono text-sm text-cyan-100" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-cyan-100']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-3 flex flex-col gap-2 sm:flex-row sm:items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.pickTeamId),
            ...{ class: "select select-bordered flex-1 border-white/10 bg-black/40 font-mono text-sm text-slate-100" },
        });
        /** @type {__VLS_StyleScopedClasses['select']} */ ;
        /** @type {__VLS_StyleScopedClasses['select-bordered']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-100']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: (0),
            disabled: true,
        });
        for (const [x] of __VLS_vFor((__VLS_ctx.teamsAll))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (x.id),
                value: (x.id),
            });
            (x.name);
            // @ts-ignore
            [detail, canManageTeams, pickTeamId, teamsAll,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.assignTeam) },
            type: "button",
            ...{ class: "btn border-0 bg-gradient-to-r from-cyan-600 to-emerald-600 font-mono text-slate-950" },
            disabled: (__VLS_ctx.busy || !__VLS_ctx.pickTeamId),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-cyan-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-emerald-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-950']} */ ;
    }
    if (__VLS_ctx.isAdmin) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-8 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-amber-500/25']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-amber-950/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "font-mono text-sm text-amber-100" },
        });
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-100']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-1 text-xs text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-48']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-white/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        for (const [u] of __VLS_vFor((__VLS_ctx.expertOptions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                key: (u.id),
                ...{ class: "flex cursor-pointer items-center gap-2 text-sm text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
                ...{ class: "checkbox checkbox-sm border-amber-500/40" },
                value: (u.id),
            });
            (__VLS_ctx.expertPick);
            /** @type {__VLS_StyleScopedClasses['checkbox']} */ ;
            /** @type {__VLS_StyleScopedClasses['checkbox-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-amber-500/40']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (u.username);
            // @ts-ignore
            [busy, pickTeamId, assignTeam, isAdmin, expertOptions, expertPick,];
        }
        if (!__VLS_ctx.expertOptions.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.saveExperts) },
            type: "button",
            ...{ class: "btn mt-4 border-0 bg-gradient-to-r from-amber-600 to-orange-600 font-mono text-white" },
            disabled: (__VLS_ctx.busy),
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
        /** @type {__VLS_StyleScopedClasses['from-amber-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['to-orange-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    }
    if (__VLS_ctx.msg) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "mt-4 font-mono text-xs text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        (__VLS_ctx.msg);
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
[busy, expertOptions, saveExperts, msg, msg, err, err,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
