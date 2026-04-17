import axios from 'axios'

/** Empty base = same origin (use Vite proxy in dev). Set VITE_API_URL for direct API host. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
})
