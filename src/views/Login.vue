<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-container">
        <img src="/img/logo.png" alt="Logo" class="logo">
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="rules" label-width="0" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="用户名"
            tabindex="1"
            @focus="onFocus('username')"
            @blur="onBlur"
            @click="onClick('username')"
          >
            <template #prefix>
              <el-icon><UserFilled /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="密码"
            show-password
            tabindex="2"
            @focus="onFocus('password')"
            @blur="onBlur"
            @click="onClick('password')"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="loading" 
            class="login-button" 
            @click="handleLogin"
            tabindex="3"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled, Lock } from '@element-plus/icons-vue'
import { login } from '@/api/auth'
import { getConfig } from '@/api/config'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const focusedElement = ref('')
const loginFormRef = ref(null)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

onMounted(async () => {
  // 如果用户已经登录，直接跳转到首页或重定向页面
  const config = await getConfig()
  if (!config.is_configured) {
    router.push('/config')
  }
})

const onFocus = (field) => {
  focusedElement.value = field
}

const onBlur = () => {
  focusedElement.value = ''
}

const onClick = (field) => {
}

const handleLogin = async () => {
  if (!loginFormRef.value) {
    return
  }
  
  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await login(loginForm)
        ElMessage.success('登录成功')
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      } catch (error) {
        console.error('Login failed:', error)
        ElMessage.error(error.response?.data?.detail || '登录失败')
      } finally {
        loading.value = false
      }
    } else {
      return false
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  position: relative;
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo {
  height: 128px;
  width: 128px;
  object-fit: contain;
}

.debug-info {
  margin: 10px 0;
  padding: 5px;
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  color: #67c23a;
  border-radius: 4px;
  font-size: 12px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}

.login-button {
  width: 100%;
}

/* Ensure the input fields can be interacted with */
:deep(.el-input__wrapper) {
  z-index: 11;
}

:deep(.el-input__inner) {
  z-index: 12;
}
</style> 