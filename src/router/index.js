import { createRouter, createWebHistory } from 'vue-router'

const Index = () => import('../views/Index.vue')

const routes = [
  {
    path: '/',
    component: Index,
    meta: {
      title: 'Phonetic Dictionary - AI 合成英文发音'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  window.document.title = to.meta.title
  next()
})

export default router