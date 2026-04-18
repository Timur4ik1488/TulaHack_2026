import axios from 'axios'

/** Текст из FastAPI `detail` (строка или массив validation errors). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { detail?: unknown } | undefined
    if (d?.detail != null) {
      const detail = d.detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) {
        return detail
          .map((x) => {
            if (typeof x === 'object' && x != null && 'msg' in x) {
              return String((x as { msg: string }).msg)
            }
            return JSON.stringify(x)
          })
          .join('; ')
      }
    }
  }
  return fallback
}
