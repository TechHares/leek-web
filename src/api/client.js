import axios from 'axios'
import { getToken } from './auth'
import { ElMessage } from 'element-plus'
import { safeRedirectToLogin } from '@/utils/redirect'
import { getCurrentProjectId } from '@/utils/projectStorage'

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

    const projectId = getCurrentProjectId()
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
      safeRedirectToLogin(currentPath, true)
    } else if (error.response?.status === 451) {
      // 系统未配置，跳转到配置页面
      window.location.href = '/config'
    }
    return Promise.reject(error)
  }
)

/**
 * SSE POST 请求（流式返回）
 * @param {string} url - 请求路径
 * @param {object} data - 请求体
 * @param {function} onMessage - 收到消息时的回调
 * @returns {Promise} - 完成或失败时 resolve/reject
 */
export async function ssePost(url, data, onMessage) {
  const token = getToken()
  const projectId = getCurrentProjectId()
  
  if (!projectId && !isWhitelisted(url)) {
    ElMessage.error('请选择项目')
    throw new Error('未选择项目')
  }
  
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (projectId) {
    headers['project-id'] = projectId
  }
  
  const response = await fetch(`/api/v1${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token')
      const currentPath = window.location.pathname + window.location.search
      safeRedirectToLogin(currentPath, true)
    }
    const error = await response.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(error.detail || '请求失败')
  }
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let lastData = null
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value)
    const lines = text.split('\n').filter(line => line.startsWith('data: '))
    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6))
        lastData = data
        if (onMessage) {
          onMessage(data)
        }
      } catch (e) {
        console.warn('Failed to parse SSE data:', line)
      }
    }
  }
  
  if (lastData?.status === 'failed') {
    throw new Error(lastData.message)
  }
  return lastData
}

export default apiClient