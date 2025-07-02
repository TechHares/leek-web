import apiClient from './client'

// 获取回测记录列表
export function getBacktestRecords(params) {
  return apiClient.get('/backtest/records', { params })
}

// 获取回测记录详情
export function getBacktestRecord(id) {
  return apiClient.get(`/backtest/records/${id}`)
}

// 创建回测
export function createBacktest(data) {
  return apiClient.post('/backtest', data)
}

// 获取回测结果
export function getBacktestResult(id) {
  return apiClient.get(`/backtest/${id}/result`)
}

// 获取回测K线数据
export function getBacktestKlines(id, params) {
  return apiClient.get(`/backtest/${id}/klines`, { params })
}

// 获取回测交易记录
export function getBacktestTrades(id, params) {
  return apiClient.get(`/backtest/${id}/trades`, { params })
}

// 删除回测记录
export function deleteBacktestRecord(id) {
  return apiClient.delete(`/backtest/records/${id}`)
}

// 获取可用于回测的策略列表
export function getStrategiesForBacktest() {
  return apiClient.get('/strategies', { params: { is_enabled: 1 } })
}

// 获取可用于回测的数据源列表
export function getDataSourcesForBacktest() {
  return apiClient.get('/datasources', { params: { is_enabled: 1 } })
}
