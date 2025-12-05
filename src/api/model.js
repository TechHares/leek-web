import apiClient from './client'

// 获取模型列表
export function getModels(params) {
  return apiClient.get('/models', { params })
}

// 获取单个模型
export function getModel(id) {
  return apiClient.get(`/models/${id}`)
}

// 创建模型
export function createModel(data) {
  return apiClient.post('/models', data)
}

// 更新模型
export function updateModel(id, data) {
  return apiClient.put(`/models/${id}`, data)
}

// 删除模型
export function deleteModel(id) {
  return apiClient.delete(`/models/${id}`)
}

// 上传模型文件
export function uploadModel(file, data) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', data.name)
  formData.append('version', data.version)
  if (data.description) {
    formData.append('description', data.description)
  }
  return apiClient.post('/models/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 下载模型文件
export function downloadModel(id) {
  return apiClient.get(`/models/${id}/download`, {
    responseType: 'blob'
  })
}

