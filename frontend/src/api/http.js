import axios, { isAxiosError, } from 'axios';
/** Empty base = same origin (use Vite proxy in dev). Set VITE_API_URL for direct API host. */
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '',
    withCredentials: true,
});
/** Одна общая попытка refresh при протухшем access (иначе F5 «выкидывает» из сессии). */
let refreshSessionPromise = null;
async function refreshSessionOnce() {
    if (!refreshSessionPromise) {
        refreshSessionPromise = api
            .post('/api/auth/refresh', null, { skipAuthRefresh: true })
            .then(() => undefined)
            .finally(() => {
            refreshSessionPromise = null;
        });
    }
    await refreshSessionPromise;
}
function requestUrl(cfg) {
    const u = cfg.url;
    return typeof u === 'string' ? u : '';
}
api.interceptors.response.use((r) => r, async (error) => {
    if (!isAxiosError(error)) {
        return Promise.reject(error);
    }
    const status = error.response?.status;
    const cfg = error.config;
    if (!cfg || status !== 401 || cfg.skipAuthRefresh || cfg._retry) {
        return Promise.reject(error);
    }
    const url = requestUrl(cfg);
    if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        return Promise.reject(error);
    }
    cfg._retry = true;
    try {
        await refreshSessionOnce();
        return api(cfg);
    }
    catch {
        return Promise.reject(error);
    }
});
