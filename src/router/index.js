import { createRouter, createWebHistory } from 'vue-router'
import { getToken, checkAuth } from '@/api/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/views/Config.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Overview.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'dashboard/overview',
        name: 'DashboardOverview',
        component: () => import('@/views/dashboard/Overview.vue'),
        meta: { requiresAuth: true, title: '概览' }
      },
      {
        path: 'dashboard/assets',
        name: 'DashboardAssets',
        component: () => import('@/views/dashboard/Assets.vue'),
        meta: { requiresAuth: true, title: '资产' }
      },
      {
        path: 'dashboard/performance',
        name: 'DashboardPerformance',
        component: () => import('@/views/dashboard/Performance.vue'),
        meta: { requiresAuth: true, title: '性能分析' }
      },
      {
        path: 'authorization/user',
        name: 'UserManagement',
        component: () => import('@/views/auth/UserManagement.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '用户管理' }
      },
      {
        path: 'authorization/role',
        name: 'RoleManagement',
        component: () => import('@/views/auth/RoleManagement.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '角色管理' }
      },
      {
        path: 'setting',
        name: 'Setting',
        component: () => import('@/views/Setting.vue'),
        meta: { title: '系统设置' }
      },
      {
        path: 'executor/trade',
        name: 'ExecutorTrade',
        component: () => import('@/views/executor/Trade.vue'),
        meta: { title: '交易执行器' }
      },
      {
        path: 'executor/exe_order',
        name: 'ExecutorExeOrder',
        component: () => import('@/views/executor/ExecutionInfo.vue'),
        meta: { title: '交易器订单' }
      },
      {
        path: 'executor/order',
        name: 'ExecutorOrder',
        component: () => import('@/views/executor/Order.vue'),
        meta: { title: '交易所订单' }
      },
      {
        path: 'executor/config',
        name: 'ExecutorConfig',
        component: () => import('@/views/executor/RouteConfig.vue'),
        meta: { title: '执行器设置' }
      },
      {
        path: 'datasource/datasource',
        name: 'DataSource',
        component: () => import('@/views/datasouce/DataSource.vue'),
        meta: { title: '数据源' }
      },
      {
        path: 'asset/position',
        name: 'Position',
        component: () => import('@/views/asset/Position.vue'),
        meta: { title: '仓位' }
      },
      {
        path: 'asset/position_setting',
        name: 'PositionSetting',
        component: () => import('@/views/asset/PositionSetting.vue'),
        meta: { title: '仓位设置' }
      },
      {
        path: 'asset/transaction',
        name: 'Transaction',
        component: () => import('@/views/asset/Transaction.vue'),
        meta: { title: '流水' }
      },
      {
        path: 'strategy/strategy',
        name: 'Strategy',
        component: () => import('@/views/strategy/Strategy.vue'),
        meta: { title: '策略管理' }
      },
      {
        path: 'strategy/signal',
        name: 'Signal',
        component: () => import('@/views/strategy/Signal.vue'),
        meta: { title: '策略信号' }
      },
      {
        path: 'backtest/records',
        name: 'BacktestList',
        component: () => import('@/views/backtest/BacktestList.vue'),
        meta: { title: '回测记录' }
      },
      {
        path: 'backtest/config',
        name: 'BacktestDataConfig',
        component: () => import('@/views/backtest/DataConfig.vue'),
        meta: { title: '数据配置' }
      },
      {
        path: 'backtest/cost',
        name: 'BacktestCostConfig',
        component: () => import('@/views/backtest/CostConfig.vue'),
        meta: { title: '费用配置' }
      },
      {
        path: 'risk/policies',
        name: 'RiskPolicies',
        component: () => import('@/views/risk/RiskPolicies.vue'),
        meta: { title: '风控策略' }
      },
      {
        path: 'risk/events',
        name: 'RiskEvents',
        component: () => import('@/views/risk/RiskEvents.vue'),
        meta: { title: '风险事件' }
      },
      {
        path: 'risk/logs',
        name: 'RiskLogs',
        component: () => import('@/views/risk/RiskLogs.vue'),
        meta: { title: '风控日志' }
      },
      
    ]
  },
  
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  // 如果目标路径已经是配置页面，不需要检查配置
  if (to.path === '/config') {
    next()
    return
  }
  
  // 如果目标路径是登录页面，直接允许访问
  if (to.path === '/login') {
    next()
    return
  }
  
  // 检查登录状态
  const token = getToken()
  if (to.meta.requiresAuth && !token) {
    // 避免重定向循环：如果当前已经在登录页面，不要添加redirect参数
    if (from.path === '/login') {
      next('/')
      return
    }
    
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 如果已登录，验证 token 有效性
  if (token && to.meta.requiresAuth) {
    try {
      const user = await checkAuth()
      if (!user) {
        // 避免重定向循环：如果当前已经在登录页面，不要添加redirect参数
        if (from.path === '/login') {
          next('/')
          return
        }
        
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
        return
      }
      
      // 检查是否需要管理员权限
      if (to.meta.requiresAdmin && !user.is_admin) {
        next('/')
        return
      }
      
      // 将用户信息存储在路由元数据中，避免组件中重复调用API
      to.meta.userVerified = true
      to.meta.userData = user
    } catch (error) {
      console.error('Failed to check auth:', error)
      // 避免重定向循环：如果当前已经在登录页面，不要添加redirect参数
      if (from.path === '/login') {
        next('/')
        return
      }
      next('/login')
      return
    }
  }

  next()
})

export default router 