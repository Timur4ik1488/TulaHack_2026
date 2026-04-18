import { axios } from './axiosCompat'

/** Клиент API: те же методы, что у axios, с поддержкой дженериков для vue-tsc. */
export interface HackSwipeApi {
  get<T = unknown>(url: string, config?: object): Promise<{ data: T }>
  post<T = unknown>(url: string, data?: unknown, config?: object): Promise<{ data: T }>
  put<T = unknown>(url: string, data?: unknown, config?: object): Promise<{ data: T }>
  patch<T = unknown>(url: string, data?: unknown, config?: object): Promise<{ data: T }>
  delete<T = unknown>(url: string, config?: object): Promise<{ data: T }>
  interceptors: {
    response: {
      use(
        onFulfilled: (value: unknown) => unknown,
        onRejected?: (error: unknown) => unknown,
      ): number
    }
  }
}

type AuthRequestConfig = {
  url?: string
  skipAuthRefresh?: boolean
  _retry?: boolean
}

/** Runtime-инстанс axios (для interceptors и повторного запроса с полным config). */
const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
})

/** Публичный клиент с типизированными get/post/… */
export const api = rawApi as HackSwipeApi

/** Одна общая попытка refresh при протухшем access (иначе F5 «выкидывает» из сессии). */
let refreshSessionPromise: Promise<void> | null = null

async function refreshSessionOnce(): Promise<void> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = rawApi
      .post('/api/auth/refresh', null, { skipAuthRefresh: true })
      .then(() => undefined)
      .finally(() => {
        refreshSessionPromise = null
      })
  }
  await refreshSessionPromise
}

rawApi.interceptors.response.use(
  (r: unknown) => r,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }
    const ax = error as { response?: { status?: number }; config?: AuthRequestConfig }
    const status = ax.response?.status
    const cfg = ax.config
    if (!cfg || status !== 401 || cfg.skipAuthRefresh || cfg._retry) {
      return Promise.reject(error)
    }
    const url = String(cfg.url ?? '')
    if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
      return Promise.reject(error)
    }
    cfg._retry = true
    try {
      await refreshSessionOnce()
      return rawApi(cfg)
    } catch {
      return Promise.reject(error)
    }
  },
)
