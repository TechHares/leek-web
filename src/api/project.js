import apiClient from './client'

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

// 单独为启用/暂停设置更长超时（20s）
export function toggleProjectStatus(id, isEnabled) {
  return apiClient.patch(
    `/projects/${id}`,
    { is_enabled: isEnabled },
    { timeout: 20000 }
  )
}