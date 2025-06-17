// 资产类型
export const AssetType = {
  CRYPTO: 'CRYPTO',
  STOCK: 'STOCK',
  FUTURES: 'FUTURES',
  FOREX: 'FOREX',
  INDEX: 'INDEX',
  BOND: 'BOND',
  COMMODITY: 'COMMODITY',
  OPTION: 'OPTION'
}

// 交易品种类型
export const TradeInsType = {
  SPOT: 1,      // 现货
  MARGIN: 2,    // 杠杆
  SWAP: 3,      // 合约
  FUTURES: 4,   // 期货
  OPTION: 5     // 期权
}

// 交易方向
export const PositionSide = {
  LONG: 1,      // 多
  SHORT: 2      // 空
}

// 订单状态
export const OrderStatus = {
  CREATED: 'created',
  SUBMITTED: 'submitted',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELED: 'canceled',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  ERROR: 'error'
}

// 订单类型
export const OrderType = {
  MARKET: 1,  // 市价单
  LIMIT: 2    // 限价单
}

// 交易模式
export const TradeMode = {
  ISOLATED: 'isolated',  // 逐仓
  CROSS: 'cross'         // 全仓
}

// 获取资产类型标签样式
export function getAssetTypeTag(type) {
  const typeMap = {
    [AssetType.CRYPTO]: 'success',
    [AssetType.STOCK]: 'warning',
    [AssetType.FUTURES]: 'danger'
  }
  return typeMap[type] || 'info'
}

// 获取资产类型中文
export function assetTypeZh(type) {
  const map = {
    [AssetType.STOCK.toLowerCase()]: '股',
    [AssetType.FUTURES.toLowerCase()]: '期',
    [AssetType.CRYPTO.toLowerCase()]: '币',
    [AssetType.FOREX.toLowerCase()]: '汇',
    [AssetType.INDEX.toLowerCase()]: '指',
    [AssetType.BOND.toLowerCase()]: '债',
    [AssetType.COMMODITY.toLowerCase()]: '商',
    [AssetType.OPTION.toLowerCase()]: '权'
  }
  return map[(type || '').toLowerCase()] || type
}

export function assetTypeDesc(type) {
  const map = {
    [AssetType.STOCK.toLowerCase()]: '股票',
    [AssetType.FUTURES.toLowerCase()]: '期货',
    [AssetType.CRYPTO.toLowerCase()]: '加密货币',
    [AssetType.FOREX.toLowerCase()]: '外汇',
    [AssetType.INDEX.toLowerCase()]: '指数',
    [AssetType.BOND.toLowerCase()]: '债券',
    [AssetType.COMMODITY.toLowerCase()]: '商品',
    [AssetType.OPTION.toLowerCase()]: '期权'
  }
  return map[(type || '').toLowerCase()] || type
}

// 获取交易品种类型中文
export function insTypeZh(insType) {
  const map = {
    [TradeInsType.SPOT]: '现',
    [TradeInsType.MARGIN]: '杠',
    [TradeInsType.SWAP]: '约',
    [TradeInsType.FUTURES]: '期',
    [TradeInsType.OPTION]: '权'
  }
  return map[insType] || insType
}

// 获取交易品种类型中文
export function insTypeDesc(insType) {
    const map = {
      [TradeInsType.SPOT]: '现货',
      [TradeInsType.MARGIN]: '杠杆',
      [TradeInsType.SWAP]: '合约',
      [TradeInsType.FUTURES]: '期货',
      [TradeInsType.OPTION]: '期权'
    }
    return map[insType] || insType
  }

// 获取交易方向中文
export function sideZh(side) {
  const map = {
    [PositionSide.LONG]: '多',
    [PositionSide.SHORT]: '空'
  }
  return map[side] || side
}

// 获取交易方向标签样式
export function getPositionSideTag(side) {
  const sideMap = {
    [PositionSide.LONG]: 'success',
    [PositionSide.SHORT]: 'danger'
  }
  return sideMap[side] || 'info'
}

// 获取订单状态标签样式
export function getOrderStatusType(status) {
  const statusMap = {
    [OrderStatus.CREATED]: 'info',
    [OrderStatus.SUBMITTED]: 'info',
    [OrderStatus.PARTIALLY_FILLED]: 'info',
    [OrderStatus.FILLED]: 'success',
    [OrderStatus.CANCELED]: 'info',
    [OrderStatus.REJECTED]: 'info',
    [OrderStatus.EXPIRED]: 'info',
    [OrderStatus.ERROR]: 'info'
  }
  return statusMap[status] || 'info'
}

// 获取订单状态中文
export function getOrderStatusText(status) {
  const statusMap = {
    [OrderStatus.CREATED]: '创建',
    [OrderStatus.SUBMITTED]: '已提交',
    [OrderStatus.PARTIALLY_FILLED]: '部分成交',
    [OrderStatus.FILLED]: '全部成交',
    [OrderStatus.CANCELED]: '已撤单',
    [OrderStatus.REJECTED]: '被拒绝',
    [OrderStatus.EXPIRED]: '过期',
    [OrderStatus.ERROR]: '异常'
  }
  return statusMap[status] || status
}

export function orderTypeText(val) {
  const map = { 
    [OrderType.MARKET]: '市价单', 
    [OrderType.LIMIT]: '限价单' 
  }
  return map[val] || val
}

export function tradeModeText(val) {
  const map = { 
    [TradeMode.ISOLATED]: '逐仓', 
    [TradeMode.CROSS]: '全仓' 
  }
  return map[val] || val
} 