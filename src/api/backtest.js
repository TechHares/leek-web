import apiClient from './client'

// Walk-forward: 创建任务
export function createWalkForwardTask(data) {
  return apiClient.post('/backtest/walk-forward', data)
}

// 获取任务
export function getBacktestTask(taskId) {
  return apiClient.get(`/backtest/${taskId}`, { params: { expand_series: true } })
}

// 回测记录：列表
export function getBacktestRecords(params) {
  return apiClient.get('/backtest', { params })
}

// 回测记录：详情（别名到任务查询）
export function getBacktestRecord(id) {
  return apiClient.get(`/backtest/${id}`, { params: { expand_series: true } })
}

// 回测记录：删除
export function deleteBacktestRecord(id) {
  return apiClient.delete(`/backtest/${id}`)
}

// 获取可用于回测的策略列表
export function getStrategiesForBacktest() {
  return apiClient.get('/strategies', { params: { is_enabled: 1 } })
}

// 获取可用于回测的数据源列表
export function getDataSourcesForBacktest() {
  return apiClient.get('/datasources', { params: { is_enabled: 1 } })
}

// Backtest Config APIs
export function listBacktestConfigs(params) {
  return apiClient.get('/backtest/config', { params })
}

export function createBacktestConfig(data) {
  return apiClient.post('/backtest/config', data)
}

export function updateBacktestConfig(id, data) {
  return apiClient.put(`/backtest/config/${id}`, data)
}

export function deleteBacktestConfig(id) {
  return apiClient.delete(`/backtest/config/${id}`)
}
