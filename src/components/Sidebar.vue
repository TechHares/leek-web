<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': collapsed }">
    <div class="logo-container">
      <div class="logo-text-wrapper">
        <img src="/img/logo.png" alt="Logo" class="logo" height="32" width="32" />
        <h1 v-show="!collapsed">量韭</h1>
      </div>
    </div>
    
    <el-menu
      :default-active="$route.path"
      :router="true"
      class="sidebar-menu"
      :collapse="collapsed"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#409EFF"
    >
      <!-- 仪表盘 -->
      <el-sub-menu index="dashboard">
        <template #title>
          <el-icon><PieChart /></el-icon>
          <span>仪表盘</span>
        </template>
        <el-menu-item index="/dashboard/assets">收益</el-menu-item>
        <el-menu-item index="/dashboard/performance">策略性能</el-menu-item>
      </el-sub-menu>
            
      <!-- 资产 -->
      <el-sub-menu index="asset">
        <template #title>
          <el-icon><Wallet /></el-icon>
          <span>资产管理</span>
        </template>
        <el-menu-item index="/asset/position">仓位</el-menu-item>
        <el-menu-item index="/asset/transaction">流水</el-menu-item>
        <el-menu-item index="/asset/position_setting">仓位设置</el-menu-item>
        <!-- <el-menu-item index="/asset/risk">风控管理</el-menu-item> -->  
      </el-sub-menu>

      <!-- 风控 -->
      <el-sub-menu index="risk">
        <template #title>
          <el-icon><Operation /></el-icon>
          <span>风控</span>
        </template>
        <el-menu-item index="/risk/policies">策略信号风控</el-menu-item>
        <el-menu-item index="/risk/position_policy">仓位主动风控</el-menu-item>
        <!-- <el-menu-item index="/risk/events">风险事件</el-menu-item> -->
        <el-menu-item index="/risk/logs">风控日志</el-menu-item>
      </el-sub-menu>

      <!-- 数据源 -->
      <el-sub-menu index="datasource">
        <template #title>
          <el-icon><List /></el-icon>
          <span>数据源</span>
        </template>
        <el-menu-item index="/datasource/datasource">数据源管理</el-menu-item>
        <el-menu-item index="/datasource/datastrategy">数据源策略</el-menu-item>
      </el-sub-menu>
      
      <!-- 交易器 -->
      <el-sub-menu index="executor">
        <template #title>
          <el-icon><Money /></el-icon>
          <span>交易器</span>
        </template>
        <el-menu-item index="/executor/trade">交易器管理</el-menu-item>
        <el-menu-item index="/executor/exe_order">交易器订单</el-menu-item>
        <el-menu-item index="/executor/order">交易所订单</el-menu-item>
        <el-menu-item index="/executor/config">交易器设置</el-menu-item>
      </el-sub-menu>
      
      <!-- 策略 -->
      <el-sub-menu index="strategy">
        <template #title>
          <el-icon><Guide /></el-icon>
          <span>策略</span>
        </template>
        <el-menu-item index="/strategy/strategy">策略管理</el-menu-item>
        <el-menu-item index="/strategy/signal">策略信号</el-menu-item>
        <!-- <el-menu-item index="/strategy/risk">策略风险信息</el菜单> -->
      </el-sub-menu>

      <!-- 策略回测（一级菜单） -->
      <el-sub-menu index="backtest">
        <template #title>
          <el-icon><Guide /></el-icon>
          <span>策略回测</span>
        </template>
        <el-menu-item index="/backtest/records">回测记录</el-menu-item>
        <el-menu-item index="/backtest/config">数据配置</el-menu-item>
        <el-menu-item index="/backtest/cost">费用配置</el-menu-item>
      </el-sub-menu>

      <!-- 因子分析（一级菜单） -->
      <el-sub-menu index="factor_analysis">
        <template #title>
          <el-icon><Aim /></el-icon>
          <span>因子</span>
        </template>
        <!-- 管理功能 -->
        <el-menu-item index="/factor_analysis/factors">因子管理</el-menu-item>
        <!-- <el-menu-item index="/factor_analysis/groups">因子组合</el-menu-item> -->
        <!-- 分析功能 -->
        <el-menu-item index="/factor_analysis/evaluation">因子分析</el-menu-item>
        <!-- <el-menu-item index="/factor_analysis/backtest">因子回测</el-menu-item> -->
        <!-- 运维功能 -->
        <el-menu-item index="/factor_analysis/monitoring">因子监控</el-menu-item>
        <el-menu-item index="/factor_analysis/health">健康检查</el-menu-item>
      </el-sub-menu>
      
      <!-- 模型 -->
      <el-sub-menu index="model">
        <template #title>
          <el-icon><Cpu /></el-icon>
          <span>模型</span>
        </template>
        <el-menu-item index="/model/training">模型训练</el-menu-item>
        <el-menu-item index="/model/online">模型上线</el-menu-item>
      </el-sub-menu>
      
      <!-- 调度 -->
      <el-sub-menu index="scheduler">
        <template #title>
          <el-icon><Timer /></el-icon>
          <span>调度</span>
        </template>
        <el-menu-item index="/scheduler/download">数据下载</el-menu-item>
        <el-menu-item index="/scheduler/risk">风控</el-menu-item>
      </el-sub-menu>
      
      <!-- 角色与授权 -->
      <el-sub-menu index="authorization">
        <template #title>
          <el-icon><Avatar /></el-icon>
          <span>角色与授权</span>
        </template>
        <el-menu-item index="/authorization/user">用户管理</el-menu-item>
        <el-menu-item index="/authorization/role">角色管理</el-menu-item>
      </el-sub-menu>
      
      <!-- 系统设置 -->
      <el-menu-item index="/setting">
        <el-icon><Setting /></el-icon>
        <span>系统设置</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  PieChart,
  List,
  Link,
  Cpu,
  Wallet,
  Guide,
  Operation,
  Money,
  Timer,
  Avatar,
  Tools,
  Expand,
  Fold,
  Aim,
  Document,
  Collection,
  Folder,
  DataAnalysis,
  VideoPlay,
  Monitor,
  Warning,
  Setting
} from '@element-plus/icons-vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:collapsed'])

const route = useRoute()
const activeMenu = computed(() => {
  return route.path
})

const toggleSidebar = () => {
  emit('update:collapsed', !props.collapsed)
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  width: 240px;
  background-color: #304156;
  color: #bfcbd9;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 64px;
}

.logo-container {
  height: 60px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background-color: #263445;
  position: relative;
  justify-content: center;
}

.logo-text-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.logo-container h1 {
  color: #fff;
  margin-left: 10px;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.logo-container .logo {
  height: 32px;
  width: 32px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    transform: translateX(-100%);
  }
  
  .sidebar:not(.sidebar-collapsed) {
    transform: translateX(0);
  }
  
  .sidebar-collapsed {
    transform: translateX(-100%);
  }
}
</style> 