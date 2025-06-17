import apiClient from './client'

// 获取执行器列表，支持 enable 参数和不分页
export function getExecutors(params) {
  return apiClient.get('/executor/traders', { params })
}

// 获取执行器详情
export function getExecutor(id) {
  return apiClient.get(`/executor/traders/${id}`)
}

// 创建执行器
export function createExecutor(data) {
  return apiClient.post('/executor/traders', data)
}

// 更新执行器
export function updateExecutor(id, data) {
  return apiClient.put(`/executor/traders/${id}`, data)
}

// 删除执行器
export function deleteExecutor(id) {
  return apiClient.delete(`/executor/traders/${id}`)
}

export function getExecutorTemplates(params) {
  return apiClient.get('/templates/executor', { params })
} 

export function getOrders(params) {
  return apiClient.get('/executor/orders', { params })
}

export function getOrder(id) {
  return apiClient.get(`/executor/orders/${id}`)
}

export function getExecutionOrders(params) {
  return apiClient.get('/executor/execution_orders', { params })
}