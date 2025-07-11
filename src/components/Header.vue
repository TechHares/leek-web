<template>
  <div class="header">
    <div class="header-left">
      <el-icon class="menu-toggle" @click="$emit('toggle-sidebar')"><Menu /></el-icon>
      <el-select
        v-model="selectedProjectId"
        placeholder="请选择项目"
        style="font-size: 22px; font-weight: bold; min-width: 100px;margin-left: 10px;"
        @change="handleProjectChange"
        filterable
      >
        <el-option
          v-for="item in projects"
          :key="item.id"
          :label="item.name"
          :value="String(item.id)"
        />
      </el-select>
    </div>
    
    <div class="header-right">
      <el-dropdown v-if="currentUser" trigger="click">
        <div class="user-dropdown">
          <el-avatar :size="32" :icon="User" />
          <span class="username" v-if="!isSmallScreen">{{ currentUser.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$emit('open-profile')">
              <el-icon><User /></el-icon>
              <span>个人信息</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="isAdmin" @click="navigateToConfig">
              <el-icon><Setting /></el-icon>
              <span>数据库配置</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="isAdmin" @click="openProjectDialog">
              <el-icon><Setting /></el-icon>
              <span>项目管理</span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="$emit('logout')">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
  <el-dialog v-model="projectDialogVisible" title="项目管理" width="800px">
    <div class="project-management">
      <div class="project-header">
        <el-button type="primary" @click="handleCreateProject">
          <el-icon><Plus /></el-icon>新建项目
        </el-button>
      </div>
      
      <el-table :data="projects" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button type="primary" link @click="handleEditProject(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" link @click="handleDeleteProject(scope.row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 项目表单对话框 -->
    <el-dialog
      v-model="projectFormVisible"
      :title="formType === 'create' ? '新建项目' : '编辑项目'"
      width="500px"
      append-to-body
    >
      <el-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectRules"
        label-width="80px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            placeholder="请输入项目描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectFormVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProjectForm" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { Menu, User, ArrowDown, Setting, SwitchButton, Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, createProject, updateProject, deleteProject } from '@/api/project'
import { formatDate } from '@/utils/format'

const router = useRouter()

const props = defineProps({
  // title: {
  //   type: String,
  //   default: '仪表盘'
  // },
  currentUser: {
    type: Object,
    default: null
  },
  isSmallScreen: {
    type: Boolean,
    default: false
  }
})

const isAdmin = computed(() => {
  return props.currentUser && 
    (props.currentUser.is_admin === true || 
     props.currentUser.is_admin === 1 || 
     props.currentUser.is_admin === "true" ||
     props.currentUser.is_admin === "1" ||
     props.currentUser.is_admin === "yes")
})

const navigateToConfig = () => {
  router.push('/config')
}

const projectDialogVisible = ref(false)
const projectFormVisible = ref(false)
const formType = ref('create')
const loading = ref(false)
const submitting = ref(false)
const projects = ref([])
const projectFormRef = ref(null)
const selectedProjectId = ref(null)

const projectForm = ref({
  name: '',
  description: ''
})

const projectRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
  ]
}

const loadProjects = async () => {
  const res = await getProjects()
  projects.value = res.data || []
  // 读取本地已选 projectId
  const savedId = localStorage.getItem('current_project_id')
  // 检查本地 id 是否在项目列表中
  if (savedId && projects.value.some(p => String(p.id) === String(savedId))) {
    selectedProjectId.value = String(savedId)
  } else if (projects.value.length > 0) {
    selectedProjectId.value = String(projects.value[0].id)
    localStorage.setItem('current_project_id', String(projects.value[0].id))
  } else {
    selectedProjectId.value = null
    localStorage.removeItem('current_project_id')
    projectDialogVisible.value = true
  }
}

const handleCreateProject = () => {
  formType.value = 'create'
  projectForm.value = {
    name: '',
    description: ''
  }
  projectFormVisible.value = true
}

const handleEditProject = (row) => {
  formType.value = 'edit'
  projectForm.value = { ...row }
  projectFormVisible.value = true
}

const handleDeleteProject = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该项目吗？', '提示', {
      type: 'warning'
    })
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    loadProjects()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const submitProjectForm = async () => {
  if (!projectFormRef.value) return
  
  await projectFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (formType.value === 'create') {
          await createProject(projectForm.value)
          ElMessage.success('创建成功')
        } else {
          await updateProject(projectForm.value.id, projectForm.value)
          ElMessage.success('更新成功')
        }
        projectFormVisible.value = false
        loadProjects()
      } catch (error) {
        ElMessage.error(formType.value === 'create' ? '创建失败' : '更新失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const openProjectDialog = () => {
  projectDialogVisible.value = true
}

const handleProjectChange = (id) => {
  localStorage.setItem('current_project_id', String(id))
  window.location.reload() // 切换项目后刷新页面
}

onMounted(() => {
  loadProjects()
})

// 监听对话框显示状态
watch(projectDialogVisible, (val) => {
  if (val) {
    loadProjects()
  }
})

defineEmits(['toggle-sidebar', 'logout', 'open-profile', 'openSystemConfig'])
</script>

<style scoped>
.header {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-left h2 {
  margin: 0;
  margin-left: 15px;
  font-size: 18px;
  font-weight: 500;
}

.menu-toggle {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.menu-toggle:hover {
  color: #409EFF;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 8px;
  height: 40px;
  border-radius: 4px;
}

.user-dropdown:hover {
  background-color: #f6f6f6;
}

.username {
  margin: 0 8px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .header {
    padding: 0 10px;
  }
}

.project-management {
  padding: 20px 0;
}
.project-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}
</style> 