import apiClient from './client'

// 获取项目列表
export function getProjects() {
  return apiClient.get('/projects')
}

export function createProject(data) {
  return apiClient.post('/projects', data)
}

export function updateProject(id, data) {
  return apiClient.put(`/projects/${id}`, data)
}

export function deleteProject(id) {
  return apiClient.delete(`/projects/${id}`)
} 