import apiClient from './client'

// 创建模型训练任务
export function createModelTraining(data) {
  return apiClient.post('/model_training', data)
}

// 获取模型训练任务详情
export function getModelTrainingTask(taskId) {
  return apiClient.get(`/model_training/${taskId}`)
}

// 获取模型训练任务列表
export function getModelTrainingTasks(params) {
  return apiClient.get('/model_training', { params })
}

// 删除模型训练任务
export function deleteModelTrainingTask(taskId) {
  return apiClient.delete(`/model_training/${taskId}`)
}

