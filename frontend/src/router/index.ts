import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/leaderboard' },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/LeaderboardView.vue'),
      meta: { public: true },
    },
    {
      path: '/podium',
      name: 'podium',
      component: () => import('../views/PodiumView.vue'),
      meta: { public: true },
    },
    {
      path: '/teams/:id',
      name: 'team-public',
      component: () => import('../views/TeamPublicView.vue'),
      meta: { public: true },
    },
    {
      path: '/jury/swipe',
      name: 'jury-swipe',
      component: () => import('../views/JurySwipeView.vue'),
      meta: { roles: ['expert', 'admin'] },
    },
    {
      path: '/jury/score/:id',
      name: 'jury-score',
      component: () => import('../views/JuryScoreView.vue'),
      meta: { roles: ['expert', 'admin'] },
    },
    {
      path: '/jury/teams',
      name: 'jury-teams',
      component: () => import('../views/JuryTeamsView.vue'),
      meta: { roles: ['expert', 'admin'] },
    },
    {
      path: '/team/profile',
      name: 'team-profile',
      component: () => import('../views/TeamProfileView.vue'),
      meta: { roles: ['participant', 'admin', 'expert'] },
    },
    {
      path: '/team/breakdown',
      name: 'team-breakdown',
      component: () => import('../views/TeamBreakdownView.vue'),
      meta: { roles: ['participant', 'admin', 'expert'] },
    },
    {
      path: '/team/chat',
      name: 'team-chat',
      component: () => import('../views/TeamChatView.vue'),
      meta: { roles: ['participant', 'admin', 'expert'] },
    },
    {
      path: '/admin/teams',
      name: 'admin-teams',
      component: () => import('../views/AdminTeamsView.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/admin/criteria',
      name: 'admin-criteria',
      component: () => import('../views/AdminCriteriaView.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/AdminUsersView.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/timer',
      name: 'hackathon-timer',
      component: () => import('../views/AdminTimerView.vue'),
      meta: { public: true },
    },
    {
      path: '/admin/timer',
      name: 'admin-timer',
      redirect: '/timer',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    return true
  }
  if (!auth.user && !auth.loading) {
    await auth.fetchMe()
  }
  if (!auth.user) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles
  if (roles?.length && auth.role && !roles.includes(auth.role)) {
    return { path: '/leaderboard' }
  }
  return true
})

export default router
