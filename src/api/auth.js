import apiClient from './client'

export const login = async (credentials) => {
  // 使用REST风格发送JSON数据
  const response = await apiClient.post('/auth/tokens', {
    username: credentials.username,
    password: credentials.password
  })
  // 保存 token 到 localStorage
  localStorage.setItem('token', response.data.access_token)
  return response.data
}

export const logout = () => {
  localStorage.removeItem('token')
}

export const getToken = () => {
  return localStorage.getItem('token')
}

export const checkAuth = async () => {
  try {
    const response = await apiClient.get('/auth/users/me')
    return response.data
  } catch (error) {
    return null
  }
}

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('currentUser')
  return userStr ? JSON.parse(userStr) : null
} 