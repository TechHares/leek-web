import apiClient from './client'

// 获取训练器列表
export function getTrainers(params) {
  return apiClient.get('/trainers', { params })
}

// 获取单个训练器
export function getTrainer(id) {
  return apiClient.get(`/trainers/${id}`)
}

// 创建训练器
export function createTrainer(data) {
  return apiClient.post('/trainers', data)
}

// 更新训练器
export function updateTrainer(id, data) {
  return apiClient.put(`/trainers/${id}`, data)
}

// 启用训练器
export function enableTrainer(id) {
  return apiClient.put(`/trainers/${id}/enable`)
}

// 禁用训练器
export function disableTrainer(id) {
  return apiClient.put(`/trainers/${id}/disable`)
}

// 删除训练器
export function deleteTrainer(id) {
  return apiClient.delete(`/trainers/${id}`)
}

// 获取训练器模板列表
export function getTrainerTemplates() {
  return apiClient.get('/templates/trainer')
}

