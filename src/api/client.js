import axios from 'axios'
import { getToken } from './auth'
import { ElMessage } from 'element-plus'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 5000
})

// 白名单路径
const PROJECT_ID_WHITELIST = [
  '/authorization',
  '/auth',
  '/system',
  '/projects'
]

// 判断是否在白名单
function isWhitelisted(url) {
  return PROJECT_ID_WHITELIST.some(prefix => url.startsWith(prefix))
}

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const projectId = localStorage.getItem('current_project_id')
    // 检查是否需要 project_id
    if (!projectId && !isWhitelisted(config.url)) {
      ElMessage.error('请选择项目：' + config.url)
      // 直接拒绝请求
      return Promise.reject(new Error('未选择项目'))
    }
    if (projectId) {
      config.headers['project-id'] = projectId
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('token')
      const currentPath = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
    } else if (error.response?.status === 451) {
      // 系统未配置，跳转到配置页面
      window.location.href = '/config'
    }
    return Promise.reject(error)
  }
)

export default apiClient 