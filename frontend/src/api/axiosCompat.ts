/**
 * С `vue-tsc -b` пакет `axios` в этом репозитории резолвится как namespace без нормальных экспортов типов
 * (нет AxiosInstance / default.create в .d.ts для текущего moduleResolution).
 * Runtime у axios всегда есть `default.create` — оборачиваем в `any` только для типчекера.
 */
import * as AxiosModule from 'axios'

const root = (AxiosModule as { default?: typeof AxiosModule }).default ?? AxiosModule

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const axios: any = root
