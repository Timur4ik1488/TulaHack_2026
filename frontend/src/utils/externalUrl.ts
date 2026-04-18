/** Ссылка из БД без схемы → открывается как https */
export function externalUrl(raw: string | null | undefined): string {
  const u = (raw ?? '').trim()
  if (!u) return '#'
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}
