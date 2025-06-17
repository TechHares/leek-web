import apiClient from './client'

// 获取策略列表
export function getStrategies(params) {
  return apiClient.get('/strategies', { params })
}

// 获取单个策略
export function getStrategy(id) {
  return apiClient.get(`/strategies/${id}`)
}

// 创建策略
export function createStrategy(data) {
  return apiClient.post('/strategies', data)
}

// 更新策略
export function updateStrategy(id, data) {
  return apiClient.put(`/strategies/${id}`, data)
}

// 删除策略
export function deleteStrategy(id) {
  return apiClient.delete(`/strategies/${id}`)
}

// 运行策略
export function runStrategy(id) {
  return apiClient.post(`/strategies/${id}/run`)
}

// 获取入场策略列表
export function getEnterStrategies() {
  return apiClient.get('/strategies/enter')
}

// 获取出场策略列表
export function getExitStrategies() {
  return apiClient.get('/strategies/exit')
}

// 获取策略模板列表
export function getStrategyTemplates(params) {
  return apiClient.get('/templates/strategy', { params })
}

// 获取入场策略模板列表
export function getEnterStrategyTemplates(params) {
  return apiClient.get('/templates/strategy/enter', { params })
}

// 获取出场策略模板列表
export function getExitStrategyTemplates(params) {
  return apiClient.get('/templates/strategy/exit', { params })
}

// 获取风控策略模板列表
export function getStrategyPolicyTemplates(params) {
    return apiClient.get('/templates/strategy/policy', { params })
}

// 获取策略Fabricator模板列表
export function getStrategyFabricatorTemplates(params) {
  return apiClient.get('/templates/strategy/fabricator', { params })
}
