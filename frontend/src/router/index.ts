import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
});

// Sincronización del título de pestaña en el navegador
router.beforeEach((to, _from, next) => {
  const metaTitle = to.meta?.title as string | undefined;
  if (metaTitle) {
    document.title = `${metaTitle} • YogurArte`;
  } else {
    document.title = 'YogurArte • Sistema Operativo Integral';
  }
  next();
});

export default router;
