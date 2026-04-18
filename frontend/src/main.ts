import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useAuthStore } from './stores/auth'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

const auth = useAuthStore(pinia)
await auth.fetchMe()

app.use(router)
await router.isReady()
app.mount('#app')
