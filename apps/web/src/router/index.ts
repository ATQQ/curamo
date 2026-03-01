import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'sources',
          name: 'Sources',
          component: () => import('@/views/Sources.vue'),
        },
        {
          path: 'articles',
          name: 'Articles',
          component: () => import('@/views/Articles.vue'),
        },
        {
          path: 'tasks',
          name: 'Tasks',
          component: () => import('@/views/Tasks.vue'),
        },
        {
          path: 'tasks/:id',
          name: 'TaskDetail',
          component: () => import('@/views/TaskDetail.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/Settings.vue'),
        },
      ],
    },
  ],
})

export default router
