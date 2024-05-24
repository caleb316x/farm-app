import { createMemoryHistory, createRouter } from 'vue-router'

import FarmView from '../views/FarmView.vue'
// import AboutView from './AboutView.vue'

const routes = [
  { path: '/', component: FarmView },
//   { path: '/about', component: AboutView },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router