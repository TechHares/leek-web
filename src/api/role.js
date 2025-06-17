import axios from './client'

// 角色相关 API
export const getRoles = () => axios.get('/authorization/roles')
export const createRole = (data) => axios.post('/authorization/roles', data)
export const updateRole = (id, data) => axios.put(`/authorization/roles/${id}`, data)
export const deleteRole = (id) => axios.delete(`/authorization/roles/${id}`)

// 权限相关 API
export const getPermissions = () => axios.get('/authorization/permissions')
export const updateRolePermissions = (id, data) => axios.put(`/authorization/roles/${id}`, data) 