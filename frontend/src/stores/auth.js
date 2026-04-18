import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '../api/http';
export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const loading = ref(false);
    const role = computed(() => user.value?.role ?? null);
    const isLoggedIn = computed(() => !!user.value);
    async function fetchMe() {
        loading.value = true;
        try {
            const { data } = await api.get('/api/auth/me');
            user.value = data;
        }
        catch {
            user.value = null;
        }
        finally {
            loading.value = false;
        }
    }
    async function login(email, password) {
        await api.post('/api/auth/login', { email, password });
        await fetchMe();
    }
    async function register(payload) {
        await api.post('/api/auth/register', payload);
        await fetchMe();
    }
    async function logout() {
        try {
            await api.post('/api/auth/logout');
        }
        finally {
            user.value = null;
        }
    }
    return { user, loading, role, isLoggedIn, fetchMe, login, register, logout };
});
