import apiClient from './client'

// 获取风险控制策略列表
export function getRiskPolicies(params) {
  return apiClient.get('/risk-policies', { params })
}

// 获取单个风险控制策略
export function getRiskPolicy(id) {
  return apiClient.get(`/risk-policies/${id}`)
}

// 创建风险控制策略
export function createRiskPolicy(data) {
  return apiClient.post('/risk-policies', data)
}

// 更新风险控制策略
export function updateRiskPolicy(id, data) {
  return apiClient.put(`/risk-policies/${id}`, data)
}

// 删除风险控制策略
export function deleteRiskPolicy(id) {
  return apiClient.delete(`/risk-policies/${id}`)
}

// ============== 风控日志相关接口 ==============

// 获取风控日志列表
export function getRiskLogs(params) {
  return apiClient.get('/risk-logs', { params })
}

// 获取单个风控日志详情
export function getRiskLog(id) {
  return apiClient.get(`/risk-logs/${id}`)
}

// 获取风控仪表盘数据
export function getRiskDashboard(params) {
  return apiClient.get('/risk-dashboard', { params })
}