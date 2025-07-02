import request from './client'
import apiClient from './client'

export function getConfig() {
  return request({
    url: '/system/configurations',
    method: 'get'
  }).then(response => {
    return response.data
  })
}

export function saveConfig(data) {
  return request({
    url: '/system/configurations',
    method: 'put',
    data
  })
}

// 获取当前项目配置
export function getProjectConfig() {
  return apiClient.get('/config')
}

// 保存当前项目配置
export function saveProjectConfig(data) {
  return apiClient.put('/config', data)
} 

export function getAlarmTemplates() {
  return apiClient.get('/templates/alarm')
}

// 刷新挂载目录
export function refreshMountDirs() {
  return apiClient.patch('/config/mount_dirs')
}

export function restartEngine() {
  return apiClient.post('/config/restart')
}

export function resetPositionState() {
  return apiClient.post('/config/reset_position_state')
}