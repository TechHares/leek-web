import apiClient from './client'

export function getDashboardOverview() {
  return apiClient.get('/dashboard/overview')
}

export function getDashboardAsset(params) {
  return apiClient.get('/dashboard/asset', { params })
}

export function getPositionStatus() {
  return apiClient.get('/dashboard/position-status')
} 