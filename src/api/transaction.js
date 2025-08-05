import request from './client'

// 获取交易流水列表
export function getTransactions(params) {
  return request({
    url: '/transactions',
    method: 'get',
    params
  })
}

// 获取交易流水详情
export function getTransaction(id) {
  return request({
    url: `/transactions/${id}`,
    method: 'get'
  })
} 