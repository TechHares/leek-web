import apiClient from './client'

export function getSignals(params) {
  return apiClient.get('/signals', { params })
}

export function getSignal(id) {
  return apiClient.get(`/signals/${id}`)
} 