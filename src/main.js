import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './styles/main.scss'
import axios from 'axios'
import { ElMessage } from 'element-plus'

// Configure axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || window.location.origin
axios.interceptors.response.use(
  response => response,
  error => {
    // Handle common errors
    const { response } = error
    if (response) {
      const { status, data } = response
      if (status === 401) {
        ElMessage.error('会话已过期，请重新登录')
        router.push('/login')
      } else if (status === 403) {
        ElMessage.error('没有权限执行此操作')
      } else if (status === 451) {
        ElMessage.warning('系统未完成配置，正在跳转至配置页面')
        router.push('/config')
      } else if (data && data.detail) {
        ElMessage.error(data.detail)
      }
    } else {
      ElMessage.error('网络错误，请检查您的连接')
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)
// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Create toast plugin
const toast = {
  success(message) {
    ElMessage.success(message)
  },
  error(message) {
    ElMessage.error(message)
  },
  warning(message) {
    ElMessage.warning(message)
  },
  info(message) {
    ElMessage.info(message)
  }
}

app.config.globalProperties.$http = axios
app.config.globalProperties.$toast = toast

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})

// 捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled Promise Rejection:', event.reason)
  ElMessage.error('操作失败，请重试')
})

app.mount('#app') 