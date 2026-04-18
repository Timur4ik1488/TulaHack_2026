/** Дефолт из `public/` — если URL из БД ведёт на 404, срабатывает @error. */
export const DEFAULT_TEAM_AVATAR = '/default-team-avatar.png';
export function teamPhotoSrc(url) {
    const u = url?.trim();
    if (u)
        return u;
    return DEFAULT_TEAM_AVATAR;
}
export function onTeamPhotoError(ev) {
    const el = ev.target;
    if (el.dataset.fallback === '1')
        return;
    el.dataset.fallback = '1';
    el.src = DEFAULT_TEAM_AVATAR;
}
/** Аватар пользователя: тот же запасной файл, что и у команд без фото. */
export function userAvatarSrc(url) {
    const u = url?.trim();
    if (u)
        return u;
    return DEFAULT_TEAM_AVATAR;
}
export const onUserAvatarError = onTeamPhotoError;
