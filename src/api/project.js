import apiClient, { ssePost } from './client'

// 获取项目列表
export function getProjects() {
  return apiClient.get('/projects')
}

export function createProject(data) {
  return apiClient.post('/projects', data)
}

export function updateProject(id, data) {
  return apiClient.patch(`/projects/${id}`, data)
}

export function deleteProject(id) {
  return apiClient.delete(`/projects/${id}`)
}

/**
 * 引擎控制接口（SSE 流式返回）
 * @param {string} action - 'start' | 'stop' | 'restart'
 * @param {function} onMessage - 收到消息时的回调 ({ status, message })
 * @returns {Promise} - 完成或失败时 resolve/reject
 */
export function controlEngine(action, onMessage) {
  return ssePost('/engines', { action }, onMessage)
}