import apiClient from './client'

// 获取风险控制策略列表
export function getRiskPolicies() {
  return apiClient.get('/api/risk-policies')
}

// 获取单个风险控制策略
export function getRiskPolicy(id) {
  return apiClient.get(`/api/risk-policies/${id}`)
}

// 创建风险控制策略
export function createRiskPolicy(data) {
  return apiClient.post('/api/risk-policies', data)
}

// 更新风险控制策略
export function updateRiskPolicy(id, data) {
  return apiClient.put(`/api/risk-policies/${id}`, data)
}

// 删除风险控制策略
export function deleteRiskPolicy(id) {
  return apiClient.delete(`/api/risk-policies/${id}`)
} 