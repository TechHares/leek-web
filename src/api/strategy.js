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

// 更新策略状态
export function updateStrategyState(id, data) {
  return apiClient.put(`/strategies/${id}/state`, data)
}

// 重启策略
export function restartStrategy(id) {
  return apiClient.put(`/strategies/${id}/restart`)
}

// 删除策略实例
export function deleteStrategyInstance(strategyId, instanceId) {
  return apiClient.delete(`/strategies/${strategyId}/instance/${instanceId}`)
}

// 删除策略
export function deleteStrategy(id) {
  return apiClient.delete(`/strategies/${id}`)
}

// 运行策略
export function runStrategy(id) {
  return apiClient.post(`/strategies/${id}/run`)
}

// 进出场子策略接口已移除

// 获取策略模板列表
export function getStrategyTemplates(params) {
  return apiClient.get('/templates/strategy', { params })
}

// 进出场子策略模板接口已移除

// 获取风控策略模板列表
export function getStrategyPolicyTemplates(params) {
    return apiClient.get('/templates/strategy/policy', { params })
}

// 获取策略Fabricator模板列表
export function getStrategyFabricatorTemplates(params) {
  return apiClient.get('/templates/strategy/fabricator', { params })
}

// 获取策略实例列表（每个策略的实例IDs）
export function getStrategyInstances() {
  return apiClient.get('/strategies/instances')
}
