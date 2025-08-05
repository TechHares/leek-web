import apiClient from './client'

/**
 * 获取项目整体性能指标
 * @param {Object} params 查询参数
 * @param {string} params.start_time 开始时间
 * @param {string} params.end_time 结束时间
 * @returns {Promise} API响应
 */
export const getProjectPerformance = (params = {}) => {
  return apiClient.get('/performance', { params })
}

/**
 * 获取项目下所有策略的性能数据
 * @param {Object} params 查询参数
 * @param {string} params.start_time 开始时间
 * @param {string} params.end_time 结束时间
 * @returns {Promise} API响应
 */
export const getStrategiesPerformance = (params = {}) => {
  return apiClient.get('/performance/strategies', { params })
}

/**
 * 获取项目整体资产曲线数据
 * @param {Object} params 查询参数
 * @param {string} params.start_time 开始时间
 * @param {string} params.end_time 结束时间
 * @returns {Promise} API响应
 */
export const getEquityCurve = (params = {}) => {
  return apiClient.get('/performance/equity-curve', { params })
}

/**
 * 获取项目整体交易统计
 * @param {Object} params 查询参数
 * @param {string} params.start_time 开始时间
 * @param {string} params.end_time 结束时间
 * @returns {Promise} API响应
 */
export const getTradeStatistics = (params = {}) => {
  return apiClient.get('/performance/trades', { params })
}

/**
 * 清除性能分析缓存
 * @returns {Promise} API响应
 */
export const clearPerformanceCache = () => {
  return apiClient.post('/performance/clear-cache')
}