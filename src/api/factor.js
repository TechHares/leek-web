import apiClient from './client'

// 获取因子列表
export function getFactors(params) {
  return apiClient.get('/factors', { params })
}

// 获取单个因子
export function getFactor(id) {
  return apiClient.get(`/factors/${id}`)
}

// 创建因子
export function createFactor(data) {
  return apiClient.post('/factors', data)
}

// 更新因子
export function updateFactor(id, data) {
  return apiClient.put(`/factors/${id}`, data)
}

// 启用因子
export function enableFactor(id) {
  return apiClient.put(`/factors/${id}/enable`)
}

// 禁用因子
export function disableFactor(id) {
  return apiClient.put(`/factors/${id}/disable`)
}

// 删除因子
export function deleteFactor(id) {
  return apiClient.delete(`/factors/${id}`)
}

// 获取因子模板列表
export function getFactorTemplates() {
  return apiClient.get('/templates/factor')
}

