import apiClient from './client'

// 获取标签生成器列表
export function getLabelGenerators(params) {
  return apiClient.get('/label_generators', { params })
}

// 获取单个标签生成器
export function getLabelGenerator(id) {
  return apiClient.get(`/label_generators/${id}`)
}

// 创建标签生成器
export function createLabelGenerator(data) {
  return apiClient.post('/label_generators', data)
}

// 更新标签生成器
export function updateLabelGenerator(id, data) {
  return apiClient.put(`/label_generators/${id}`, data)
}

// 启用标签生成器
export function enableLabelGenerator(id) {
  return apiClient.put(`/label_generators/${id}/enable`)
}

// 禁用标签生成器
export function disableLabelGenerator(id) {
  return apiClient.put(`/label_generators/${id}/disable`)
}

// 删除标签生成器
export function deleteLabelGenerator(id) {
  return apiClient.delete(`/label_generators/${id}`)
}

// 获取标签生成器模板列表
export function getLabelGeneratorTemplates() {
  return apiClient.get('/templates/label_generator')
}

