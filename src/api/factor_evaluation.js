import apiClient from './client'

// 创建因子分析任务
export function createFactorEvaluation(data) {
  return apiClient.post('/factor_evaluation', data)
}

// 获取因子分析任务详情
export function getFactorEvaluationTask(taskId, params = {}) {
  return apiClient.get(`/factor_evaluation/${taskId}`, { params })
}

// 获取因子分析任务列表
export function getFactorEvaluationTasks(params) {
  return apiClient.get('/factor_evaluation', { params })
}

// 删除因子分析任务
export function deleteFactorEvaluationTask(taskId) {
  return apiClient.delete(`/factor_evaluation/${taskId}`)
}

// 获取单个因子的图表数据（解压后的IC序列和时间戳）
export function getFactorCharts(taskId, factorId, params = {}) {
  return apiClient.get(`/factor_evaluation/${taskId}/factor/${factorId}/charts`, { params })
}

