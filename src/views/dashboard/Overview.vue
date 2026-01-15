<template>
  <div class="dashboard-overview">
    <div class="card-grid">
      <el-card class="card multi-bar-card">
        <div class="multi-bar-row" v-for="item in barList" :key="item.label">
          <div class="bar-label">{{ item.label }}</div>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="item.status"
              :style="{ width: item.percent + '%' }"
            ></div>
          </div>
          <div class="bar-value">{{ item.value }}</div>
        </div>
      </el-card>
      <el-card class="card">
        <div class="card-title">引擎信息</div>
        <table class="sysinfo-table">
          <tbody>
            <tr>
              <td>进程ID：</td>
              <td><b>{{ state.process_id }}</b></td>
            </tr>
            <tr>
              <td>数据源数：</td>
              <td><b>{{ state.data_source_count }}</b></td>
            </tr>
            <tr>
              <td>策略数：</td>
              <td><b>{{ state.strategy_count }}</b></td>
            </tr>
            <tr>
              <td>执行器数：</td>
              <td><b>{{ state.executor_count }}</b></td>
            </tr>
          </tbody>
        </table>
      </el-card>
      <el-card class="card">
        <div class="card-title">系统信息</div>
        <table class="sysinfo-table">
          <tbody>
            <tr>
              <td>CORE版本：</td>
              <td><b>{{ coreVersion }}</b></td>
            </tr>
            <tr>
              <td>系统版本：</td>
              <td><b>{{ sysVersion }}</b></td>
            </tr>
            <tr>
              <td>开源协议：</td>
              <td><b>MIT</b></td>
            </tr>
            <tr>
              <td>开源地址：</td>
              <td><b>
                <a href="https://github.com/orgs/TechHares/repositories" target="_blank">leek</a>
              </b></td>
            </tr>
          </tbody>
        </table>
      </el-card>
      <el-card class="card latest-info-card">
        <div class="card-title">最新信息</div>
        <div class="latest-info-content">
          <div class="info-row">
            <span class="info-label">版本号：</span>
            <span class="info-value">{{ latestVersion }}</span>
          </div>
          <div class="info-row version-description">
            <span class="info-label">更新内容：</span>
            <div class="description-content">
              <div v-for="(item, index) in versionDescriptionList" :key="index" class="description-item">
                {{ item }}
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, computed } from 'vue'
import { getDashboardOverview } from '@/api/dashboard'
import { emitter } from '@/utils/emitter'
import { getCurrentProjectId } from '@/utils/projectStorage'

const state = ref({})
const barList = ref([])
const coreVersion = ref('')
const sysVersion = ref('')
const latestVersion = ref('')
const versionDescription = ref('')

let timer = null

const fetchData = async () => {
  if (document.hidden) return;
  try {
    const projectId = getCurrentProjectId()
    if (!projectId) {
      return
    }
    const res = await getDashboardOverview()
    
    // 先设置版本信息，这些信息总是可用的
    coreVersion.value = res.data.core_version || ''
    sysVersion.value = res.data.sys_version || ''
    latestVersion.value = res.data.version || ''
    versionDescription.value = res.data.body || ''
    
    // 然后处理资源和状态信息
    const resources = res.data?.resources
    if (resources) {
      state.value = res.data.state
      const { cpu, memory, disk } = resources
      barList.value = [
        {
          label: 'CPU',
          percent: cpu.percent,
          value: cpu.value,
          status: cpu.status
        },
        {
          label: '内存',
          percent: memory.percent,
          value: memory.value,
          status: memory.status
        },
        {
          label: '硬盘',
          percent: disk.percent,
          value: disk.value,
          status: disk.status
        }
      ]
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

// 计算属性：将版本描述按行分割
const versionDescriptionList = computed(() => {
  if (!versionDescription.value) return []
  return versionDescription.value.split('\r\n').filter(item => item.trim())
})

// 关键：keep-alive 场景下的激活/失活
onActivated(() => {
  if (timer) {
    return
  }
  fetchData()
  timer = setInterval(fetchData, 8000)
  // 监听项目切换事件
  emitter.on('project-changed', fetchData)
})
onDeactivated(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  // 清理事件监听
  emitter.off('project-changed', fetchData)
})
</script>

<style scoped>
.dashboard-overview {
  padding: 32px;
  background: #f5f6fa;
  min-height: 100vh;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 32px;
  justify-content: center;
}
.multi-bar-card {
  min-width: 420px;
  min-height: 220px;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.latest-info-card {
  min-width: 420px;
  min-height: 300px;
}
.multi-bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
}
.multi-bar-row:last-child {
  margin-bottom: 0;
}
.bar-label {
  width: 60px;
  font-size: 18px;
  color: #666;
  font-weight: 500;
}
.bar-track {
  flex: 1;
  height: 18px;
  background: #f0f2f5;
  border-radius: 9px;
  margin: 0 18px;
  position: relative;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 9px;
  transition: width 0.4s;
}
.bar-fill.success {
  background: #67c23a;
}
.bar-fill.warning {
  background: #e6a23c;
}
.bar-fill.error {
  background: #f56c6c;
}
.bar-value {
  min-width: 90px;
  text-align: right;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}
.card-title {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 1px;
}
.sysinfo-table {
  margin: 0 auto;
  font-size: 18px;
}
.sysinfo-table td:first-child {
  text-align: right;
  color: #555;
  padding: 4px 2px;
  min-width: 90px;
}
.sysinfo-table td:last-child {
  text-align: left;
  font-weight: bold;
  padding: 4px 2px;
  min-width: 80px;
}
.latest-info-content {
  padding: 16px 0;
}
.info-row {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}
.info-row:last-child {
  margin-bottom: 0;
}
.info-label {
  min-width: 90px;
  font-size: 16px;
  color: #555;
  font-weight: 500;
  text-align: right;
  margin-right: 16px;
  flex-shrink: 0;
}
.info-value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  flex: 1;
}
.info-value a {
  color: #409eff;
  text-decoration: none;
}
.info-value a:hover {
  text-decoration: underline;
}
.version-description {
  align-items: flex-start;
}
.description-content {
  flex: 1;
  max-height: 200px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e9ecef;
}
.description-item {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 0;
  position: relative;
  display: flex;
  align-items: flex-start;
}
.description-item:before {
  content: "•";
  color: #409eff;
  font-weight: bold;
  margin-right: 8px;
  position: static;
}
.description-item:last-child {
  margin-bottom: 0;
}
</style> 