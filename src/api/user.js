import axios from './client'

export const getUsers = () => axios.get('/authorization/users')
export const createUser = (data) => axios.post('/authorization/users', data)
export const updateUser = (id, data) => axios.put(`/authorization/users/${id}`, data)
export const deleteUser = (id) => axios.delete(`/authorization/users/${id}`) 