<template>
  <div class="setting-page">
    <el-card>
      <el-alert
        title="系统设置不会实时生效， 引擎只在启动时应用系统设置"
        type="warning"
        show-icon
        class="mb-4"
      />
      <el-form :model="form" label-width="100px">
        <el-form-item label="日志等级">
          <el-select v-model="form.log_level" style="width: 200px">
            <el-option label="DEBUG" value="DEBUG" />
            <el-option label="INFO" value="INFO" />
            <el-option label="WARNING" value="WARNING" />
            <el-option label="ERROR" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item label="日志格式">
          <el-radio-group v-model="form.log_format">
            <el-radio value="json">JSON</el-radio>
            <el-radio value="text">Text</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="错误日志告警">
          <el-radio-group v-model="form.log_alarm">
            <el-radio :label="true">开启</el-radio>
            <el-radio :label="false">关闭</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="告警方式">
          <el-checkbox-group v-model="form.alert_methods">
            <el-checkbox v-for="template in alarmTemplates" 
              :key="template.cls" 
              :value="template.cls"
            >
              {{ template.name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="参数">
          <div v-for="method in form.alert_methods" :key="method" class="mb-4">
            <div class="mb-2">{{ getAlarmTemplateName(method) }}配置：</div>
            <DynamicForm
              v-if="getAlarmTemplate(method) && Array.isArray(getAlarmTemplate(method).parameters)"
              :fields="getAlarmTemplate(method).parameters"
              v-model:modelValue="form.alert_config[method]"
              :key="method"
            />
          </div>
        </el-form-item>
        <el-form-item label="挂载代码目录">
          <template #label>
            挂载代码目录
            <el-tooltip
              content="自定义的策略、数据源、交易器等组件在这里挂载到系统中"
              placement="top"
            >
              <el-icon class="ml-1 cursor-help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-select
            v-model="form.mount_dirs"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="请输入目录，回车添加"
            style="width: 100%"
            @change="handleMountDirsChange"
          >
            <el-option
              v-for="item in form.mount_dirs"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveConfig" :loading="saving">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt-4" header="">
      <div class="card-content-left">
        <el-button type="success" @click="refreshMountDirs" :loading="refreshingMountDirs" >刷新挂载目录</el-button>
        <el-button type="danger" @click="restartEngine" :loading="restarting">重启引擎</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { getProjectConfig, saveProjectConfig, getAlarmTemplates, refreshMountDirs as refreshMountDirsApi, restartEngine as restartEngineApi } from '@/api/config'
import DynamicForm from '@/components/DynamicForm.vue'

const form = ref({
  log_level: 'INFO',
  log_format: 'json',
  log_alarm: false,
  alert_methods: [],
  alert_config: [],
  mount_dirs: []
})
const alertConfigStr = ref('{}')
const saving = ref(false)
const alarmTemplates = ref([])
const restarting = ref(false)
const refreshingMountDirs = ref(false)

const loadConfig = async () => {
  const projectId = localStorage.getItem('current_project_id')
  if (!projectId) {
    ElMessage.error('请先选择项目')
    return
  }
  try {
    const res = await getProjectConfig()
    form.value = {
      ...res.data,
      alert_methods: res.data.alert_config ? res.data.alert_config.map(c => c.class_name) : [],
      alert_config: res.data.alert_config
        ? Object.fromEntries(res.data.alert_config.map(c => [c.class_name, c.config || {}]))
        : {},
      mount_dirs: res.data.mount_dirs || []
    }
    await fetchAlarmTemplates()
  } catch (e) {
    ElMessage.error('加载配置失败')
  }
}

const saveConfig = async () => {
  const projectId = localStorage.getItem('current_project_id')
  if (!projectId) {
    ElMessage.error('请先选择项目')
    return
  }
  saving.value = true
  try {
    // 将选中的告警方式转换为 AlarmConfig 格式
    const alertConfig = form.value.alert_methods.map(cls => ({
      class_name: cls,
      enabled: true,
      config: form.value.alert_config[cls] || {}
    }))
    
    await saveProjectConfig({
      ...form.value,
      alert_config: alertConfig,
      mount_dirs: form.value.mount_dirs
    })
    ElMessage.success('保存成功')
    loadConfig()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleMountDirsChange = (val) => {
  if (!val || val.length === 0) return
  const dirs = val
  const last = dirs[dirs.length - 1]
  const count = dirs.filter(d => d === last).length
  if (count > 1) {
    form.value.mount_dirs = dirs.filter((d, i) => d !== last || i === dirs.lastIndexOf(last))
    ElMessage.warning('该目录已添加，无需重复！')
  }
}

const fetchAlarmTemplates = async () => {
  try {
    const { data } = await getAlarmTemplates()
    alarmTemplates.value = data
  } catch (error) {
    console.error('获取告警模板失败:', error)
    ElMessage.error('获取告警模板失败')
  }
}

const getAlarmTemplate = (cls) => {
  return alarmTemplates.value.find(t => t.cls === cls)
}

const getAlarmTemplateName = (cls) => {
  const template = getAlarmTemplate(cls)
  return template ? template.name : cls
}

// 监听告警方式变化，更新告警配置
watch(() => form.value.alert_methods, (newMethods, oldMethods) => {
  // 移除不再选中的告警配置
  const removedMethods = oldMethods.filter(m => !newMethods.includes(m))
  removedMethods.forEach(method => {
    delete form.value.alert_config[method]
  })
  
  // 为新增的告警方式添加默认配置
  newMethods.forEach(method => {
    if (!form.value.alert_config[method]) {
      form.value.alert_config[method] = {}
    }
  })
}, { deep: true })

const restartEngine = async () => {
  try {
    await ElMessageBox.confirm('确认重启交易引擎?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    restarting.value = true
    await restartEngineApi()
    ElMessage.success('重启指令已发送')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('重启失败')
    }
  } finally {
    restarting.value = false
  }
}

const refreshMountDirs = async () => {
  try {
    await ElMessageBox.confirm('确认刷新挂载目录?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    refreshingMountDirs.value = true
    await refreshMountDirsApi()
    ElMessage.success('挂载目录已刷新')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('刷新挂载目录失败')
    }
  } finally {
    refreshingMountDirs.value = false
  }
}

onMounted(() => {
  loadConfig()
})

watch(() => form.value.alert_config, v => {
  alertConfigStr.value = JSON.stringify(v, null, 2)
})
</script>

<style scoped>
.setting-page {
  padding: 20px;
}
.el-card {
  width: 100%;
  box-sizing: border-box;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.ml-1 {
  margin-left: 4px;
}
.cursor-help {
  cursor: help;
}
.mt-4 {
  margin-top: 24px;
}
.card-content-left {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}
</style> 