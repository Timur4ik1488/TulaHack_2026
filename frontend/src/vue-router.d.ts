import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Skip auth */
    public?: boolean
    /** Allowed roles; omit for any logged-in user */
    roles?: ('admin' | 'expert' | 'participant')[]
  }
}
