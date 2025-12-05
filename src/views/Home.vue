<template>
  <div class="app-container">
    <!-- 加载中状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="4" animated />
    </div>
    
    <!-- 加载完成状态 -->
    <div v-else class="dashboard-layout">
      <!-- 侧边栏菜单 -->
      <Sidebar v-model:collapsed="sidebarCollapsed" />
      
      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 顶部导航 -->
        <Header 
          :current-user="currentUser"
          :is-small-screen="isSmallScreen"
          @toggle-sidebar="toggleSidebar"
          @logout="logout"
          @open-profile="openProfileDialog"
          @open-system-config="openSystemConfigDialog"
        />
        
        <!-- 主要内容 -->
        <div class="content-wrapper">
          <div class="tab-bar-bg">
            <el-tabs
              v-model="activeTab"
              type="card"
              @tab-click="handleTabClick"
              @tab-remove="removeTab"
              closable
              class="custom-tabs"
            >
              <el-tab-pane
                v-for="tab in tabs"
                :key="tab.path"
                :label="tab.title"
                :name="tab.path"
                :closable="tab.closable"
              />
            </el-tabs>
          </div>
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
          
        </div>
      </div>
    </div>
    
    <!-- 个人信息对话框 -->
    <el-dialog
      v-model="profileDialogVisible"
      title="编辑个人信息"
      width="500px"
    >
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" disabled />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="userForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="profileDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveProfile">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 系统配置对话框 -->
    <el-dialog
      v-model="systemConfigDialogVisible"
      title="数据库配置"
      width="500px"
    >
      <el-form :model="dbConfig" label-width="120px">
        <el-form-item label="数据库类型">
          <el-select v-model="dbConfig.type" placeholder="请选择数据库类型">
            <el-option label="SQLite" value="sqlite"></el-option>
            <el-option label="MySQL" value="mysql"></el-option>
            <el-option label="PostgreSQL" value="postgresql"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="dbConfig.type === 'sqlite'" label="数据库路径">
          <el-input v-model="dbConfig.path" placeholder="/path/to/database.db" />
        </el-form-item>
        
        <template v-else>
          <el-form-item label="数据库主机">
            <el-input v-model="dbConfig.host" placeholder="localhost" />
          </el-form-item>
          <el-form-item label="端口">
            <el-input-number v-model="dbConfig.port" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="数据库名称">
            <el-input v-model="dbConfig.database" placeholder="database_name" />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="dbConfig.username" placeholder="username" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="dbConfig.password" type="password" placeholder="password" show-password />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="systemConfigDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSystemConfig">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  UserFilled, 
  Setting, 
  DataBoard, 
  TrendCharts, 
  Bell, 
  SwitchButton,
  ArrowDown,
  ArrowUp,
  Close,
  Menu as MenuIcon
} from '@element-plus/icons-vue'
import { checkAuth, logout as authLogout, getToken } from '@/api/auth'
import { getConfig } from '@/api/config'
import { safeRedirectToLogin } from '@/utils/redirect'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header.vue'
import { Expand, Fold } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(true)
const currentUser = ref(null)
const sidebarCollapsed = ref(false)
const profileDialogVisible = ref(false)
const systemConfigDialogVisible = ref(false)
const isSmallScreen = ref(window.innerWidth < 768)

// 多标签页功能
const tabs = ref([
  { title: '首页', path: '/', closable: false }
])
const activeTab = ref(router.currentRoute.value.path)

function getTabTitleByRoute(route) {
  // 优先用meta.title，否则用菜单名或path
  if (route.meta && route.meta.title) return route.meta.title
  // 你可以根据实际菜单结构做更智能的映射
  if (route.path === '/') return '首页'
  if (route.path === '/authorization/user') return '用户管理'
  if (route.path === '/authorization/role') return '角色管理'
  if (route.path === '/config') return '系统设置'
  // ...可扩展其它
  return route.name || route.path
}

function addTabIfNotExist(route) {
  if (!tabs.value.find(tab => tab.path === route.path)) {
    tabs.value.push({
      title: getTabTitleByRoute(route),
      path: route.path,
      closable: route.path !== '/',
    })
  }
  activeTab.value = route.path
}

watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    addTabIfNotExist(router.currentRoute.value)
  },
  { immediate: true }
)

function removeTab(targetPath) {
  const idx = tabs.value.findIndex(tab => tab.path === targetPath)
  if (idx !== -1) {
    tabs.value.splice(idx, 1)
    // 如果关闭的是当前tab，切换到最后一个tab
    if (activeTab.value === targetPath) {
      const nextTab = tabs.value[idx] || tabs.value[idx - 1] || tabs.value[0]
      if (nextTab) {
        router.push(nextTab.path)
      }
    }
  }
}

function handleTabClick(tab) {
  if (tab.props.name !== router.currentRoute.value.path) {
    router.push(tab.props.name)
  }
}

// 用户信息表单
const userForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 数据库配置表单
const dbConfig = reactive({
  type: 'sqlite',
  path: '',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: ''
})

// 计算页面标题
const pageTitle = computed(() => {
  // 根据路由路径确定页面标题
  const pathTitleMap = {
    '/': '仪表盘',
    '/dashboard/system': '系统仪表盘',
    '/dashboard/assets': '资产仪表盘',
    '/dashboard/strategy': '策略仪表盘',
    '/settings': '系统设置'
    // 可以根据需要添加更多路径
  }
  
  return pathTitleMap[router.currentRoute.value.path] || 'LEEK'
})

// 监听窗口大小变化
const handleResize = () => {
  isSmallScreen.value = window.innerWidth < 768
  if (window.innerWidth < 992 && !sidebarCollapsed.value) {
    sidebarCollapsed.value = true
  }
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 退出登录
const logout = () => {
  authLogout()
  const currentPath = router.currentRoute.value.fullPath
  safeRedirectToLogin(currentPath)
}

// 打开个人信息对话框
const openProfileDialog = () => {
  if (currentUser.value) {
    userForm.username = currentUser.value.username
    userForm.email = currentUser.value.email || ''
    userForm.password = ''
    userForm.confirmPassword = ''
  }
  profileDialogVisible.value = true
}

// 保存个人信息
const saveProfile = async () => {
  // 校验密码
  if (userForm.password !== userForm.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  
  try {
    // 这里应该调用更新用户信息的API
    // 示例代码，需要根据实际API进行调整
    // await updateUserProfile(userForm)
    
    ElMessage.success('个人信息更新成功')
    profileDialogVisible.value = false
    
    // 更新当前用户信息
    if (currentUser.value) {
      currentUser.value.email = userForm.email
    }
  } catch (error) {
    console.error('更新个人信息失败:', error)
    ElMessage.error('更新个人信息失败')
  }
}

// 打开系统配置对话框
const openSystemConfigDialog = () => {
  // 加载数据库配置，这里应该通过API获取当前配置
  // 示例可以使用默认值
  systemConfigDialogVisible.value = true
}

// 保存系统配置
const saveSystemConfig = async () => {
  try {
    // 调整保存API，改为保存数据库配置
    // await saveConfig(dbConfig)
    ElMessage.success('数据库配置保存成功')
    systemConfigDialogVisible.value = false
  } catch (error) {
    console.error('保存数据库配置失败:', error)
    ElMessage.error('保存数据库配置失败')
  }
}

// 检查用户是否已登录
const checkAuthentication = async () => {
  // 如果没有token，直接跳转到登录页面
  const token = getToken()
  if (!token) {
    const currentPath = router.currentRoute.value.fullPath
    
    // 避免重定向到登录页面本身
    if (currentPath === '/login' || currentPath.startsWith('/login?')) {
      router.push('/')
    } else {
      safeRedirectToLogin(currentPath)
    }
    return
  }
  
  try {
    // 如果我们已经通过了路由守卫的身份验证，可以获取到路由的状态
    // 避免重复调用API
    if (router.currentRoute.value.meta.userVerified) {
      // 路由守卫已经验证过该用户，直接使用其数据
      const userData = router.currentRoute.value.meta.userData
      currentUser.value = userData
      
      // 如果后端没有返回is_admin字段，可以添加一个默认值
      if (userData && !userData.hasOwnProperty('is_admin')) {
        currentUser.value.is_admin = false
      }
      
      // 认证成功，可以加载页面数据
      loading.value = false
      return
    }
    
    // 如果路由没有缓存验证信息，检查当前用户认证状态
    const userData = await checkAuth()
    if (!userData) {
      // 认证失败，跳转到登录页面
      const currentPath = router.currentRoute.value.fullPath
      
      // 避免重定向到登录页面本身
      if (currentPath === '/login' || currentPath.startsWith('/login?')) {
        router.push('/')
      } else {
        safeRedirectToLogin(currentPath)
      }
      return
    }
    
    // 保存当前用户信息
    currentUser.value = userData
    
    // 如果后端没有返回is_admin字段，可以添加一个默认值
    if (!userData.hasOwnProperty('is_admin')) {
      currentUser.value.is_admin = false
    }
    
    // 认证成功，可以加载页面数据
    loading.value = false
  } catch (error) {
    console.error('认证检查失败:', error)
    // 认证失败，跳转到登录页面
    const currentPath = router.currentRoute.value.fullPath
    
    // 避免重定向到登录页面本身
    if (currentPath === '/login' || currentPath.startsWith('/login?')) {
      router.push('/')
    } else {
      safeRedirectToLogin(currentPath)
    }
  }
}

onMounted(() => {
  checkAuthentication()
  window.addEventListener('resize', handleResize)
  handleResize() // 初始化检查屏幕大小
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
}

.dashboard-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f0f2f5;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
}

/* 卡片样式 */
.card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  height: 100%;
}

.card-header {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 加载样式 */
.loading-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin: 20px;
}

/* 对话框表单样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.ml-10 {
  margin-left: 10px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 10px;
  }
}

/* 侧边栏折叠按钮 */
.sidebar-toggle-btn {
  position: absolute;
  left: 240px;
  top: 70px;
  transform: translateX(-50%);
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  transition: left 0.3s;
}

.sidebar-toggle-btn-collapsed {
  left: 64px;
}

.tab-bar-bg {
  background: #f5f7fa;
  margin: 0;
  padding: 0;
  border-radius: 0;
}
.custom-tabs {
  margin: 0;
  padding: 0 0 0 0;
  border-radius: 0;
  min-height: 44px;
}
.custom-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 0 0 0;
  border-radius: 0;
}
.custom-tabs :deep(.el-tabs__nav) {
  margin: 0;
  border-radius: 6px 6px 0 0;
  min-height: 44px;
}
.custom-tabs :deep(.el-tabs__item) {
  min-height: 44px;
  font-size: 15px;
}
</style> 