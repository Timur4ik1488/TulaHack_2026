import { isAxiosError } from 'axios';
/** Текст из FastAPI `detail` (строка или массив validation errors). */
export function apiErrorMessage(err, fallback) {
    if (!isAxiosError(err)) {
        return fallback;
    }
    const d = err.response?.data;
    if (d?.detail != null) {
        const detail = d.detail;
        if (typeof detail === 'string')
            return detail;
        if (Array.isArray(detail)) {
            return detail
                .map((x) => {
                if (typeof x === 'object' && x != null && 'msg' in x) {
                    return String(x.msg);
                }
                return JSON.stringify(x);
            })
                .join('; ');
        }
    }
    return fallback;
}
