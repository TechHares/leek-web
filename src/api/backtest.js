import apiClient from './client'

// 获取任务
export function getBacktestTask(taskId) {
  return apiClient.get(`/backtest/${taskId}`, { params: { expand_series: true } })
}

// Backtest records: list
export function getBacktestRecords(params) {
  return apiClient.get('/backtest', { params })
}

// Backtest record: details (alias to task query)
export function getBacktestRecord(id) {
  return apiClient.get(`/backtest/${id}`, { params: { expand_series: true } })
}

// Backtest record: delete
export function deleteBacktestRecord(id) {
  return apiClient.delete(`/backtest/${id}`)
}

// Get strategies available for backtesting
export function getStrategiesForBacktest() {
  return apiClient.get('/strategies', { params: { is_enabled: 1 } })
}

// Get data sources available for backtesting
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

// ==================== Enhanced Backtest APIs ====================

// Create enhanced backtest task
export function createEnhancedBacktest(data) {
  return apiClient.post('/backtest/enhanced', data)
}

// Get enhanced backtest results
export function getEnhancedBacktestResults(taskId, params = {}) {
  return apiClient.get(`/backtest/enhanced/${taskId}/results`, { params })
}
