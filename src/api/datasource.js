import apiClient from './client'

// 获取数据源列表
export function getDataSources(params) {
  return apiClient.get('/datasources', { params })
}

// 获取数据源
export function getDataSource(id) {
  return apiClient.get(`/datasources/${id}`)
}

// 创建数据源
export function createDataSource(data) {
  return apiClient.post('/datasources', data)
}

// 更新数据源
export function updateDataSource(id, data) {
  return apiClient.put(`/datasources/${id}`, data)
}

// 删除数据源
export function deleteDataSource(id) {
  return apiClient.delete(`/datasources/${id}`)
}

// 获取数据源模板
export function getDataSourceTemplates() {
  return apiClient.get('/templates/datasource')
}

// 获取数据源参数定义（动态）
export function fetchDataSourceParameters({ class_name, params }) {
  return apiClient.post('/templates/datasource', {
    class_name,
    params: params || {}
  })
}
