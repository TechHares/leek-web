import apiClient from './client'

export function getDashboardOverview() {
  return apiClient.get('/dashboard/overview')
} 