<template>
  <div class="backtest-detail-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="title">回测详情</div>
          <div class="meta">
            <el-tag :type="statusType(task.status)">{{ statusText(task.status) }}</el-tag>
            <span class="progress" v-if="task.status==='running'">{{ formatNumber((task.progress||0)*100,0) }}%</span>
            <el-divider direction="vertical" />
            <el-button size="small" @click="refresh" :loading="loading">刷新</el-button>
            <el-button v-if="task.status==='completed'" size="small" type="primary" @click="openResults">查看结果分析</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="3" border class="mb12">
        <el-descriptions-item label="ID">{{ task.id }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ task.name }}</el-descriptions-item>
        <el-descriptions-item label="策略类">{{ task.strategy_class || task?.config?.strategy_class }}</el-descriptions-item>
        <el-descriptions-item label="周期">{{ task.start }} ~ {{ task.end }}</el-descriptions-item>
        <el-descriptions-item label="窗口">训练{{ task.train_days }}天｜测试{{ task.test_days }}天｜隔离{{ task.embargo_days||0 }}天</el-descriptions-item>
        <el-descriptions-item label="标的×周期">{{ (task.symbols||[]).join(',') }} × {{ (task.timeframes||[]).join(',') }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions :column="3" border class="mb12">
        <el-descriptions-item label="状态"><el-tag :type="statusType(task.status)">{{ statusText(task.status) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="进度">{{ formatNumber((task.progress||0)*100,0) }}%</el-descriptions-item>
        <el-descriptions-item label="窗口进度">{{ task.current_window!=null && task.total_windows ? `${task.current_window}/${task.total_windows}` : '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ task.created_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ task.started_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ task.finished_at || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-card class="mb12" shadow="hover">
        <template #header><div class="title">输入配置</div></template>
        <pre class="json-pre">{{ pretty(task.config || {}) }}</pre>
      </el-card>

      <div v-if="task.error" class="mb12">
        <el-alert type="error" :closable="false" title="错误信息">{{ task.error }}</el-alert>
          </div>

      <el-card v-if="Array.isArray(task.logs) && task.logs.length" class="mb12" shadow="hover">
        <template #header><div class="title">运行日志</div></template>
        <pre class="json-pre">{{ (task.logs||[]).join('\n') }}</pre>
      </el-card>
    </el-card>

    <BacktestDetailDialog v-model="resultVisible" :task-id="task.id" />
  </div>
</template>

<script>
import { getBacktestTask } from '@/api/backtest'
import BacktestDetailDialog from '@/views/backtest/BacktestDetailDialog.vue'

export default {
  name: 'BacktestDetail',
  components: { BacktestDetailDialog },
  data() {
    return { task: {}, loading: false, pollTimer: null, resultVisible: false }
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const id = this.$route.params.id
        const { data } = await getBacktestTask(id)
        this.task = data || {}
        this.setupPolling()
      } finally {
        this.loading = false
      }
    },
    setupPolling() {
      this.clearPolling()
      if (this.task && this.task.status === 'running') {
        this.pollTimer = setInterval(async () => {
          try {
            const { data } = await getBacktestTask(this.task.id)
            this.task = data || this.task
            if (this.task.status !== 'running') this.clearPolling()
          } catch (e) {}
        }, 3000)
      }
    },
    clearPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null } },
    refresh() { this.load() },
    openResults() { if (this.task && this.task.status === 'completed') this.resultVisible = true },
    pretty(obj) { try { return JSON.stringify(obj || {}, null, 2) } catch { return '-' } },
    formatNumber(num, decimals = 2) { if (num === undefined || num === null) return '-'; return Number(num).toFixed(decimals).replace(/\.?0+$/, '') },
    statusType(s) { return { running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info' }[s] || 'info' },
    statusText(s) { return { pending: '排队中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' }[s] || s }
  },
  watch: {
    '$route.params.id'() { this.task = {}; this.$nextTick(() => this.load()) }
  },
  created() { this.load() },
  beforeUnmount() { this.clearPolling() }
}
</script>

<style scoped>
.backtest-detail-page { padding: 20px; }
.header-bar { display:flex; justify-content: space-between; align-items:center; }
.header-bar .title { font-weight: 600; font-size: 16px; }
.mb12 { margin-bottom: 12px; }
.json-pre { background:#f7f7f7; padding:12px; border-radius:6px; max-height:420px; overflow:auto; }
</style>


