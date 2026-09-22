import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { autoAnimatePlugin } from '@formkit/auto-animate/vue';
import router from './router';
import App from './App.vue';
import './styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(autoAnimatePlugin);
app.mount('#app');
