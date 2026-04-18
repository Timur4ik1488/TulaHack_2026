import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/http';
import { useAuthStore } from '../stores/auth';
export function useResolvedTeamId(options) {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const teamId = ref(null);
    const err = ref('');
    const teamsList = ref([]);
    const resolving = ref(false);
    function parseQueryTeamId() {
        const q = route.query.teamId;
        const s = Array.isArray(q) ? q[0] : q;
        if (s == null || s === '')
            return null;
        const n = parseInt(String(s), 10);
        return Number.isFinite(n) ? n : null;
    }
    function isStaff() {
        return auth.role === 'admin' || auth.role === 'expert';
    }
    async function loadTeamsList() {
        const { data } = await api.get('/api/teams/');
        teamsList.value = data;
    }
    async function resolve() {
        resolving.value = true;
        err.value = '';
        try {
            const fromQuery = parseQueryTeamId();
            if (fromQuery != null) {
                teamId.value = fromQuery;
                if (isStaff() && !teamsList.value.length) {
                    await loadTeamsList();
                }
                return;
            }
            if (auth.role === 'participant') {
                try {
                    const { data } = await api.get('/api/teams/my/summary');
                    teamId.value = data.team.id;
                }
                catch {
                    teamId.value = null;
                    err.value = 'Сначала вступите в команду (регистрация или инвайт).';
                }
                return;
            }
            if (isStaff()) {
                await loadTeamsList();
                if (!teamsList.value.length) {
                    teamId.value = null;
                    err.value = 'В системе пока нет команд.';
                    return;
                }
                const first = teamsList.value[0].id;
                teamId.value = first;
                if (options?.syncQueryWhenStaffDefaults) {
                    await router.replace({ path: route.path, query: { ...route.query, teamId: String(first) } });
                }
            }
        }
        finally {
            resolving.value = false;
        }
    }
    function selectTeam(id) {
        teamId.value = id;
        router.replace({ path: route.path, query: { ...route.query, teamId: String(id) } });
    }
    watch(() => route.query.teamId, () => {
        const n = parseQueryTeamId();
        if (n != null) {
            teamId.value = n;
        }
    });
    return {
        teamId,
        err,
        teamsList,
        resolving,
        resolve,
        selectTeam,
        parseQueryTeamId,
        isStaff,
        loadTeamsList,
    };
}
