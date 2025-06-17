import apiClient from './client'

// 更新仓位配置
export function updatePositionSetting(data) {
  return apiClient.put('/position/setting', data)
}

// 获取仓位设置
export function getPositionSetting() {
  return apiClient.get('/position/setting')
}

// 获取风控策略模板
export function getPolicyTemplates() {
  return apiClient.get('/templates/policy')
}

export function getPositions(params) {
  return apiClient.get('/positions', { params })
}

export function getPosition(id) {
  return apiClient.get(`/positions/${id}`)
}

export function updatePosition(id, data) {
  return apiClient.patch(`/positions/${id}`, data)
}

export function closePosition(id) {
  return apiClient.post(`/positions/${id}/close`)
} 