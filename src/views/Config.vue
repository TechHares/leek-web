<template>
  <div class="container">
    <div class="page-header">
      <img src="/logo.png" alt="Logo" class="logo" height="64" width="64"/>
      <h1>数据库配置</h1>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    
    <div v-else class="form-container card">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="业务数据库" />
        <el-step title="数据库" />
        <el-step title="管理员账号" />
        <el-step title="确认" />
      </el-steps>
      
      <div class="step-content">
        <!-- Business Database Configuration -->
        <div v-if="currentStep === 0">
          <h3>业务数据库配置</h3>
          <el-form ref="businessForm" :model="config.business_db" label-width="120px" @submit.prevent>
            <el-form-item label="数据库类型">
              <el-radio-group v-model="config.business_db.type">
                <el-radio :value="'sqlite'">SQLite</el-radio>
                <el-radio :value="'mysql'">MySQL</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <!-- SQLite Configuration -->
            <template v-if="config.business_db.type === 'sqlite'">
              <el-form-item label="数据库路径" required>
                <el-input v-model="config.business_db.path" placeholder="/path/to/your/database.db" @keyup.enter.native="next" />
              </el-form-item>
            </template>
            
            <!-- MySQL Configuration -->
            <template v-if="config.business_db.type === 'mysql'">
              <el-form-item label="主机地址" required>
                <el-input v-model="config.business_db.host" placeholder="localhost" @keyup.enter.native="next" />
              </el-form-item>
              <el-form-item label="端口" required>
                <el-input v-model.number="config.business_db.port" placeholder="3306" type="number" @keyup.enter.native="next" />
              </el-form-item>
              <el-form-item label="数据库名" required>
                <el-input v-model="config.business_db.database" placeholder="database_name" @keyup.enter.native="next" />
              </el-form-item>
              <el-form-item label="用户名" required>
                <el-input v-model="config.business_db.username" placeholder="username" @keyup.enter.native="next" />
              </el-form-item>
              <el-form-item label="密码" required>
                <el-input v-model="config.business_db.password" placeholder="password" type="password" @keyup.enter.native="next" />
              </el-form-item>
            </template>
          </el-form>
        </div>
        
        <!-- Data Database Configuration (ClickHouse) -->
        <div v-if="currentStep === 1">
          <h3>数据库配置 (ClickHouse)</h3>
          <el-form ref="dataForm" :model="config.data_db" label-width="120px" @submit.prevent>
            <el-form-item label="数据库类型">
              <el-tag>ClickHouse</el-tag>
              <input type="hidden" v-model="config.data_db.type" value="clickhouse" />
            </el-form-item>
            <el-form-item label="主机地址" required>
              <el-input v-model="config.data_db.host" placeholder="localhost" @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="端口" required>
              <el-input v-model.number="config.data_db.port" placeholder="9000" type="number" @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="数据库名">
              <el-input v-model="config.data_db.database" placeholder="default" @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="用户名" required>
              <el-input v-model="config.data_db.username" placeholder="username" @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="config.data_db.password" placeholder="password" type="password" @keyup.enter.native="next" />
            </el-form-item>
          </el-form>
        </div>
        
        <!-- Admin Account Configuration -->
        <div v-if="currentStep === 2">
          <h3>管理员账号配置</h3>
          <el-form ref="adminForm" :model="config.admin" label-width="120px" @submit.prevent>
            <el-form-item label="用户名" required>
              <el-input v-model="config.admin.username" placeholder="请输入管理员用户名" @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="密码" required>
              <el-input v-model="config.admin.password" type="password" placeholder="请输入管理员密码" show-password @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="确认密码" required>
              <el-input v-model="config.admin.confirmPassword" type="password" placeholder="请再次输入密码" show-password @keyup.enter.native="next" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="config.admin.email" placeholder="请输入管理员邮箱（可选）" @keyup.enter.native="next" />
            </el-form-item>
          </el-form>
        </div>
        
        <!-- Confirmation Step -->
        <div v-if="currentStep === 3">
          <h3>配置摘要</h3>
          <div tabindex="0" @keyup.enter="saveConfiguration">
            <el-descriptions title="业务数据库" :column="1" border>
              <el-descriptions-item label="类型">{{ config.business_db.type }}</el-descriptions-item>
              <template v-if="config.business_db.type === 'sqlite'">
                <el-descriptions-item label="路径">{{ config.business_db.path }}</el-descriptions-item>
              </template>
              <template v-else>
                <el-descriptions-item label="主机地址">{{ config.business_db.host }}</el-descriptions-item>
                <el-descriptions-item label="端口">{{ config.business_db.port }}</el-descriptions-item>
                <el-descriptions-item label="数据库名">{{ config.business_db.database }}</el-descriptions-item>
                <el-descriptions-item label="用户名">{{ config.business_db.username }}</el-descriptions-item>
                <el-descriptions-item label="密码">******</el-descriptions-item>
              </template>
            </el-descriptions>
            
            <el-descriptions title="数据库" :column="1" border class="mt-20">
              <el-descriptions-item label="类型">{{ config.data_db.type }}</el-descriptions-item>
              <el-descriptions-item label="主机地址">{{ config.data_db.host }}</el-descriptions-item>
              <el-descriptions-item label="端口">{{ config.data_db.port }}</el-descriptions-item>
              <el-descriptions-item label="数据库名">{{ config.data_db.database }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ config.data_db.username }}</el-descriptions-item>
              <el-descriptions-item label="密码">******</el-descriptions-item>
            </el-descriptions>
            
            <el-descriptions title="管理员账号" :column="1" border class="mt-20">
              <el-descriptions-item label="用户名">{{ config.admin.username }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ config.admin.email || '未设置' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>
      
      <div class="form-footer">
        <el-button v-if="currentStep > 0" @click="prev">上一步</el-button>
        <div class="spacer"></div>
        <el-button v-if="currentStep < 3" type="primary" @click="next">下一步</el-button>
        <el-button v-if="currentStep === 3" type="success" @click="saveConfiguration" :loading="saving">
          保存配置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { saveConfig, getConfig } from '@/api/config'
import { logDebug } from '@/utils/debug'

const router = useRouter()
const currentStep = ref(0)
const saving = ref(false)
const loading = ref(false)

// Default configuration
const config = reactive({
  business_db: {
    type: 'sqlite',
    path: '',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: ''
  },
  data_db: {
    type: 'clickhouse',
    host: 'localhost',
    port: 9000,
    database: 'default',
    username: 'default',
    password: ''
  },
  admin: {
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  }
})

const next = () => {
  if (currentStep.value === 0) {
    // Validate business database config
    if (config.business_db.type === 'sqlite' && !config.business_db.path) {
      ElMessage.error('请输入数据库路径')
      return
    } else if (config.business_db.type === 'mysql') {
      if (!config.business_db.host || !config.business_db.database || 
          !config.business_db.username || !config.business_db.password) {
        ElMessage.error('请填写所有必填字段')
        return
      }
    }
  } else if (currentStep.value === 1) {
    // Validate data database config
    if (!config.data_db.host || !config.data_db.username) {
      ElMessage.error('请填写主机地址和用户名')
      return
    }
  } else if (currentStep.value === 2) {
    // Validate admin account config
    if (!config.admin.username || !config.admin.password) {
      ElMessage.error('请填写管理员用户名和密码')
      return
    }
    if (config.admin.password !== config.admin.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }
    if (config.admin.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.admin.email)) {
      ElMessage.error('请输入有效的邮箱地址')
      return
    }
  }
  currentStep.value++
}

const prev = () => {
  currentStep.value--
}

const saveConfiguration = async () => {
  saving.value = true
  try {
    // Clean up configuration before saving
    const configToSave = { ...config }
    
    // Remove irrelevant fields for SQLite
    if (configToSave.business_db.type === 'sqlite') {
      delete configToSave.business_db.host
      delete configToSave.business_db.port
      delete configToSave.business_db.username
      delete configToSave.business_db.password
      delete configToSave.business_db.database
    } else {
      delete configToSave.business_db.path
    }
    
    // Remove confirm password before saving
    delete configToSave.admin.confirmPassword
    
    await saveConfig(configToSave)
    ElMessage.success('配置保存成功')
    router.push('/home')
  } catch (error) {
    console.error('Failed to save configuration:', error)
    ElMessage.error('保存配置失败，请重试')
  } finally {
    saving.value = false
  }
}

// 从API获取配置并回填数据
const fetchConfiguration = async () => {
  loading.value = true
  try {
    const response = await getConfig()
    logDebug('API 响应数据', response)
    
    // 更新业务数据库配置
    if (response.business_db) {
      logDebug('业务数据库配置', response.business_db)
      
      // 直接替换整个对象，而不是合并属性
      config.business_db.type = response.business_db.type || 'sqlite'
      config.business_db.path = response.business_db.path || ''
      config.business_db.host = response.business_db.host || 'localhost'
      config.business_db.port = response.business_db.port || 3306
      config.business_db.database = response.business_db.database || ''
      config.business_db.username = response.business_db.username || ''
      config.business_db.password = response.business_db.password || ''
      
      // 强制更新后检查
      await nextTick()
      logDebug('更新后的业务数据库配置', config.business_db)
    }
    
    // 更新数据库配置
    if (response.data_db) {
      logDebug('数据库配置', response.data_db)
      
      // 直接替换整个对象，而不是合并属性
      config.data_db.type = response.data_db.type || 'clickhouse'
      config.data_db.host = response.data_db.host || 'localhost'
      config.data_db.port = response.data_db.port || 9000
      config.data_db.database = response.data_db.database || 'default'
      config.data_db.username = response.data_db.username || 'default'
      config.data_db.password = response.data_db.password || ''
      
      // 强制更新后检查
      await nextTick()
      logDebug('更新后的数据库配置', config.data_db)
    }
    
    // 更新管理员配置
    if (response.admin) {
      logDebug('管理员配置', response.admin)
      
      // 只同步username和email，不同步密码
      config.admin.username = response.admin.username || ''
      config.admin.email = response.admin.email || ''
      // 清空密码字段，出于安全考虑不回填密码
      config.admin.password = ''
      config.admin.confirmPassword = ''
    }
    
    // 如果系统已配置，直接进入确认步骤
    if (response.is_configured) {
      currentStep.value = 3
      logDebug('已进入确认步骤', { currentStep: currentStep.value })
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    ElMessage.error('获取配置失败，将使用默认配置')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 初始化时获取配置
  fetchConfiguration()
})
</script>

<style scoped>
.step-content {
  margin-top: 30px;
  margin-bottom: 20px;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.loading-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.form-footer {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid #ebeef5;
}

.spacer {
  flex-grow: 1;
}
</style> 