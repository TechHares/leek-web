<template>
  <div class="backtest-records-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input v-model="listQuery.name" placeholder="回测名称" style="width: 180px;" class="filter-item" />
              <el-select v-model="listQuery.strategy_classes" multiple placeholder="策略" filterable style="width: 240px;" class="filter-item">
                <el-option v-for="s in strategies" :key="s.class_name" :label="s.name" :value="s.class_name" />
              </el-select>
              <el-select v-model="listQuery.statuses" multiple placeholder="回测状态" clearable style="width: 220px;" class="filter-item">
                <el-option label="运行中" value="running" />
                <el-option label="已完成" value="completed" />
                <el-option label="失败" value="failed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
              <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 240px;" class="filter-item" @change="handleDateChange" />
              <el-button type="primary" @click="handleFilter" class="filter-item">查询</el-button>
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="createVisible = true">
                <el-icon><Plus /></el-icon> 新建回测
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <div v-if="listLoading" class="text-center py-4">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else>
        <el-table :data="list || []" style="width: 100%;" size="small" align="left" border fit highlight-current-row>
          <el-table-column align="center" label="ID" width="80">
            <template #default="scope">{{ scope.row.id }}</template>
          </el-table-column>
          <el-table-column label="回测名称" min-width="150">
            <template #default="scope">
              <el-link type="primary" @click="openDetailDialog(scope.row)">{{ scope.row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column label="策略名称" min-width="160">
            <template #default="scope">{{ deriveStrategyName(scope.row) }}</template>
          </el-table-column>
          
          <el-table-column label="回测状态" align="center" width="140">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                <template v-if="scope.row.status === 'running'">
                  运行中 {{ formatNumber((scope.row.progress || 0) * 100, 0) }}%
                </template>
                <template v-else>
                  {{ getStatusText(scope.row.status) }}
                </template>
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="回测周期" align="center" width="200">
            <template #default="scope">{{ formatDate(scope.row.start) }} ~ {{ formatDate(scope.row.end) }}</template>
          </el-table-column>
          <el-table-column label="总收益率" align="right" width="120">
            <template #default="scope">
              <span :class="getTrendClass(scope.row.total_return ?? getTotalReturn(scope.row))">
                {{ formatSignedPercent(scope.row.total_return ?? getTotalReturn(scope.row)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="年化收益率" align="right" width="120">
            <template #default="scope">
              <span :class="getTrendClass(scope.row.annual_return ?? getAnnualReturn(scope.row))">
                {{ formatSignedPercent(scope.row.annual_return ?? getAnnualReturn(scope.row)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" align="right" width="100">
            <template #default="scope"><span class="text-danger">{{ formatPercent(getMaxDrawdown(scope.row)) }}</span></template>
          </el-table-column>
          <el-table-column label="夏普比率" align="right" width="100">
            <template #default="scope">{{ formatNumber(getSharpe(scope.row), 2) }}</template>
          </el-table-column>
          <el-table-column label="总交易次数" align="center" width="100">
            <template #default="scope">{{ scope.row.total_trades ?? getTotalTrades(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="窗口胜率" align="right" width="100">
            <template #default="scope">{{ formatPercent(getWinRate(scope.row)) }}</template>
          </el-table-column>
          <el-table-column label="交易胜率" align="right" width="100">
            <template #default="scope">{{ formatPercent(getTradeWinRate(scope.row)) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" width="160">
            <template #default="scope">{{ formatDateTime(scope.row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="260">
            <template #default="scope">
              <el-tooltip content="查看详情" placement="top">
                <el-button size="small" @click="handleViewDetail(scope.row)" circle>
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看回测" placement="top">
                <el-button size="small" type="primary" @click="openDetailDialog(scope.row)" circle>
                  <el-icon><DataAnalysis /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="复制为新回测" placement="top">
                <el-button size="small" type="warning" @click="handleCopy(scope.row)" circle>
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button size="small" type="danger" @click="handleDelete(scope.row)" circle>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <pagination v-show="total > 0" :total="total" v-model:page="listQuery.page" v-model:limit="listQuery.size" @pagination="getList" />

    <CreateDialog v-model:visible="createVisible" :initial-config="copyInitialConfig" @created="onCreated" />
    <BacktestDetailDialog v-model="detailDialogVisible" :task-id="detailTaskId" />

    <el-dialog v-model="dialogVisible" title="回测详情" width="900px">
      <el-tabs v-model="detailActiveTab">
        <el-tab-pane label="概览" name="overview">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="回测ID">{{ currentRecord.id }}</el-descriptions-item>
            <el-descriptions-item label="回测名称">{{ currentRecord.name }}</el-descriptions-item>
            <el-descriptions-item label="策略名称">{{ deriveStrategyName(currentRecord) }}</el-descriptions-item>
            <el-descriptions-item label="策略类">{{ currentRecord.strategy_class || currentRecord?.config?.strategy_class }}</el-descriptions-item>
            <el-descriptions-item label="回测状态">
              <el-tag :type="getStatusType(currentRecord.status)">{{ getStatusText(currentRecord.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="进度">{{ formatNumber(currentRecord.progress * 100, 0) }}%</el-descriptions-item>
            <el-descriptions-item label="总收益率">
              <span :class="getTrendClass(currentRecord.total_return ?? getTotalReturn(currentRecord))">
                {{ formatSignedPercent(currentRecord.total_return ?? getTotalReturn(currentRecord)) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="年化收益率">
              <span :class="getTrendClass(currentRecord.annual_return ?? getAnnualReturn(currentRecord))">
                {{ formatSignedPercent(currentRecord.annual_return ?? getAnnualReturn(currentRecord)) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="回测周期">{{ formatDate(currentRecord.start) }} ~ {{ formatDate(currentRecord.end) }}</el-descriptions-item>
            <el-descriptions-item label="窗口设置">
              训练{{ currentRecord.train_days }}天｜测试{{ currentRecord.test_days }}天｜隔离{{ currentRecord.embargo_days || 0 }}天｜{{ currentRecord.mode || '-' }}｜CV {{ currentRecord.cv_splits || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="标的">{{ join(currentRecord.symbols) }}</el-descriptions-item>
            <el-descriptions-item label="时间周期">{{ join(currentRecord.timeframes) }}</el-descriptions-item>
            <el-descriptions-item label="窗口数">{{ currentRecord.windows_count ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Sharpe中位数">{{ formatNumber(currentRecord.sharpe_median, 2) }}</el-descriptions-item>
            <el-descriptions-item label="Sharpe P25">{{ formatNumber(currentRecord.sharpe_p25, 2) }}</el-descriptions-item>
            <el-descriptions-item label="最大回撤中位数">{{ formatPercent(currentRecord.mdd_median) }}</el-descriptions-item>
            <el-descriptions-item label="成交数中位数">{{ formatNumber(currentRecord.trades_median, 0) }}</el-descriptions-item>
            <el-descriptions-item label="总交易次数">{{ currentRecord.total_trades ?? getTotalTrades(currentRecord) }}</el-descriptions-item>
            <el-descriptions-item label="换手率中位数">{{ formatNumber(currentRecord.turnover_median, 2) }}</el-descriptions-item>
            <el-descriptions-item label="收益中位数">{{ formatNumber(currentRecord.pnl_median, 2) }}</el-descriptions-item>
            <el-descriptions-item label="胜率">{{ formatPercent(getWinRate(currentRecord)) }}</el-descriptions-item>
            <el-descriptions-item label="阈值通过">
              <el-tag :type="currentRecord.pass_thresholds ? 'success' : 'danger'">{{ currentRecord.pass_thresholds ? '通过' : '未通过' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(currentRecord.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatDateTime(currentRecord.started_at) }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ formatDateTime(currentRecord.finished_at) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="currentRecord.error" style="margin-top:12px;">
            <el-alert type="error" :closable="false" title="错误信息">{{ currentRecord.error }}</el-alert>
          </div>
        </el-tab-pane>
        <el-tab-pane label="配置" name="config">
          <pre class="json-pre">{{ pretty(currentRecord.config) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="结果摘要" name="summary">
          <pre class="json-pre">{{ pretty(currentRecord.summary) }}</pre>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script>
import { getBacktestRecords, getBacktestRecord, deleteBacktestRecord } from '@/api/backtest'
import { getStrategyTemplates } from '@/api/strategy'
import { View, Plus, DataAnalysis, Delete, DocumentCopy } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import BacktestDetailDialog from '@/views/backtest/BacktestDetailDialog.vue'
import CreateDialog from '@/views/backtest/CreateDialog.vue'

export default {
  name: 'BacktestRecords',
  components: { View, Plus, DataAnalysis, Delete, DocumentCopy, Pagination, CreateDialog, BacktestDetailDialog },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        name: undefined,
        status: undefined,
        statuses: [],
        start_date: undefined,
        end_date: undefined,
        strategy_classes: []
      },
      dateRange: null,
      dialogVisible: false,
      currentRecord: {},
      strategies: [],
      createVisible: false,
      copyInitialConfig: null,
      detailActiveTab: 'overview',
      detailDialogVisible: false,
      detailTaskId: null
    }
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const q = { ...this.listQuery }
        // 兼容：如果选了多选，用 statuses 传参；未选则删除空数组
        if (!q.statuses || q.statuses.length === 0) delete q.statuses
        const { data } = await getBacktestRecords(q)
        let items = data.items || []
        // 前端过滤策略（后端暂不支持）
        if (this.listQuery.strategy_classes && this.listQuery.strategy_classes.length > 0) {
          items = items.filter(it => this.listQuery.strategy_classes.includes(it?.config?.strategy_class))
        }
        this.list = items
        this.total = data.total
      } catch (error) {
        console.error('获取回测记录列表失败:', error)
        this.$message.error('获取回测记录列表失败')
      }
      this.listLoading = false
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleDateChange(dates) {
      if (dates) {
        this.listQuery.start_date = dates[0]
        this.listQuery.end_date = dates[1]
      } else {
        this.listQuery.start_date = undefined
        this.listQuery.end_date = undefined
      }
    },
    async handleViewDetail(row) {
      try {
        const { data } = await getBacktestRecord(row.id)
        this.currentRecord = data
        this.dialogVisible = true
      } catch (error) {
        console.error('获取回测详情失败:', error)
        this.$message.error('获取回测详情失败')
      }
    },
    openDetailDialog(row) {
      this.detailTaskId = row.id
      this.detailDialogVisible = true
    },
    handleCreateBacktest() {
      this.$router.push('/backtest/create')
    },
    onCreated() {
      // 刷新列表
      this.getList()
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确定要删除这个回测记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteBacktestRecord(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除回测记录失败:', error)
          this.$message.error('删除回测记录失败')
        }
      }
    },
    async handleCopy(row) {
      try {
        const cfg = row.config || (await this.fetchFullTask(row.id))
        this.copyInitialConfig = cfg || {}
        this.createVisible = true
      } catch (e) {
        this.copyInitialConfig = row.config || {}
        this.createVisible = true
      }
    },
    async fetchFullTask(id) {
      try {
        const { getBacktestRecord } = await import('@/api/backtest')
        const { data } = await getBacktestRecord(id)
        return data?.config || {}
      } catch (e) {
        return {}
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    formatDateTime(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null) return '-'
      return Number(num).toFixed(decimals).replace(/\.?0+$/, '')
    },
    join(arr) {
      if (!arr) return '-'
      if (Array.isArray(arr)) return arr.join(', ')
      return String(arr)
    },
    pretty(obj) {
      try { return JSON.stringify(obj || {}, null, 2) } catch { return '-' }
    },
    formatPercent(value) {
      if (value === undefined || value === null) return '-'
      return (Number(value) * 100).toFixed(2) + '%'
    },
    formatSignedPercent(value) {
      const num = Number(value)
      if (value === undefined || value === null || !Number.isFinite(num)) return '-'
      const formatted = (num * 100).toFixed(2) + '%'
      return num > 0 ? ('+' + formatted) : formatted
    },
    getTrendClass(value) {
      const num = Number(value)
      if (value === undefined || value === null || !Number.isFinite(num)) return undefined
      if (num > 0) return 'text-success'
      if (num < 0) return 'text-danger'
      return undefined
    },
    getAggValue(row, field) {
      // 优先使用后端冗余聚合字段；若没有，则从 summary 求平均作为兜底
      if (row && row[field] !== undefined && row[field] !== null) return Number(row[field])
      const sm = row?.summary
      if (sm && typeof sm === 'object') {
        const vals = Object.values(sm)
          .map(v => (v && v[field] !== undefined && v[field] !== null) ? Number(v[field]) : null)
          .filter(v => v !== null)
        if (vals.length > 0) {
          const sum = vals.reduce((a, b) => a + b, 0)
          return sum / vals.length
        }
      }
      return null
    },
    getInitialBalance(row) {
      return Number(row?.config?.initial_balance ?? 10000)
    },
    getTotalReturn(row) {
      const pnl = this.getAggValue(row, 'pnl_median')
      const ib = this.getInitialBalance(row)
      if (pnl === undefined || pnl === null || !isFinite(ib) || ib === 0) return null
      return Number(pnl) / ib
    },
    getAnnualReturn(row) {
      const tr = this.getTotalReturn(row)
      if (tr === null) return null
      const s = row?.start, e = row?.end
      if (!s || !e) return null
      const start = new Date(s), end = new Date(e)
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)))
      try {
        return Math.pow(1 + Number(tr), 365 / days) - 1
      } catch (e) {
        return null
      }
    },
    getMaxDrawdown(row) {
      const v = this.getAggValue(row, 'mdd_median')
      return v === undefined ? null : Number(v)
    },
    getSharpe(row) {
      const v = this.getAggValue(row, 'sharpe_median')
      return v === undefined ? null : Number(v)
    },
    getTotalTrades(row) {
      const v = this.getAggValue(row, 'trades_median')
      return v === undefined || v === null ? '-' : Math.round(Number(v))
    },
    getWinRate(row) {
      const v = (row && row.win_rate !== undefined && row.win_rate !== null)
        ? Number(row.win_rate)
        : this.getAggValue(row, 'win_rate')
      return v === null ? null : Number(v)
    },
    getTradeWinRate(row) {
      const v = (row && row.trade_win_rate !== undefined && row.trade_win_rate !== null)
        ? Number(row.trade_win_rate)
        : this.getAggValue(row, 'trade_win_rate')
      return v === null ? null : Number(v)
    },
    getStatusType(status) {
      const statusMap = { running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info' }
      return statusMap[status] || 'info'
    },
    getStatusText(status) {
      const statusMap = { pending: '排队中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' }
      return statusMap[status] || status
    },
    deriveStrategyName(row) {
      const raw = row?.strategy_class || row?.config?.strategy_class || ''
      if (!raw) return '-'
      const normalized = raw.includes('|') ? raw : (() => {
        const idx = raw.lastIndexOf('.')
        if (idx === -1) return raw
        return raw.slice(0, idx) + '|' + raw.slice(idx + 1)
      })()
      const found = this.strategies.find(s => s.cls === normalized)
      if (found && found.name) return found.name
      const last = raw.split(/[.|]/).pop()
      return last || '-'
    },
    
    async loadStrategies() {
      try {
        const { data } = await getStrategyTemplates()
        this.strategies = Array.isArray(data) ? data : (data?.items || [])
      } catch (e) {
        console.error('加载策略模板失败:', e)
      }
    }
  },
  async created() {
    await this.loadStrategies()
    this.getList()
  }
}
</script>

<style scoped>
.backtest-records-page { padding: 20px; }
.el-card { margin-bottom: 20px; box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.05); border-radius: 12px; }
.header-bar .table-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.header-bar .left-actions { display: flex; gap: 8px; }
.filter-item { margin-right: 8px; }
.text-center { text-align: center; }
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.el-table { font-size: 14px; }
</style>


