<template>
  <div class="backtest-list">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <h3>回测管理</h3>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon> 新建回测
          </el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.name"
          placeholder="搜索回测名称"
          clearable
          style="width: 200px; margin-right: 10px;"
          @keyup.enter="loadData"
        />
        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          style="width: 150px; margin-right: 10px;"
          @change="loadData"
        >
          <el-option label="全部" value="" />
          <el-option label="排队中" value="pending" />
          <el-option label="运行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-button @click="loadData" :loading="loading">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
        <el-button @click="resetFilters">
          <el-icon><RefreshRight /></el-icon> 重置
        </el-button>
      </div>

      <!-- 列表 -->
      <el-table
        :data="list"
        v-loading="loading"
        border
        stripe
        style="width: 100%; margin-top: 20px;"
      >
        <el-table-column prop="name" label="名称" min-width="200" />
        <el-table-column prop="strategy_class" label="策略" min-width="150">
          <template #default="scope">
            {{ scope.row.strategy_display_name || formatStrategyName(scope.row.strategy_class) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeTagType(scope.row.type)" size="small">
              {{ getTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="scope">
            <el-progress
              v-if="scope.row.status === 'running'"
              :percentage="Math.round((scope.row.progress || 0) * 100)"
              :stroke-width="8"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sharpe_median" label="夏普比率" width="110" align="right">
          <template #default="scope">
            {{ formatNumber(scope.row.sharpe_median, 2) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_return" label="总收益率" width="110" align="right">
          <template #default="scope">
            <span :class="getTrendClass(scope.row.total_return)">
              {{ formatPercent(scope.row.total_return) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="mdd_median" label="最大回撤" width="110" align="right">
          <template #default="scope">
            <span class="text-danger">
              {{ formatPercent(Math.abs(scope.row.mdd_median || 0)) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button
                size="small"
                @click="viewDetails(scope.row)"
                :disabled="scope.row.status !== 'completed'"
              >
                查看
              </el-button>
              <el-button
                size="small"
                @click="copyTask(scope.row)"
              >
                复制
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteTask(scope.row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-if="total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; text-align: right;"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <!-- 创建弹窗 -->
    <CreateBacktestDialog
      v-model:visible="createDialogVisible"
      :initial-config="copyConfig"
      @created="handleCreated"
    />
    
    <!-- 结果查看弹窗 -->
    <ResultsDialog
      v-model:visible="resultsDialogVisible"
      :task-id="selectedTaskId"
    />
  </div>
</template>

<script>
import { Plus, Search, RefreshRight } from '@element-plus/icons-vue'
import { getBacktestRecords, deleteBacktestRecord } from '@/api/backtest'
import CreateBacktestDialog from './CreateBacktestDialog.vue'
import ResultsDialog from './ResultsDialog.vue'

export default {
  name: 'BacktestList',
  components: {
    Plus,
    Search,
    RefreshRight,
    CreateBacktestDialog,
    ResultsDialog
  },
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      pagination: {
        page: 1,
        size: 20
      },
      filters: {
        name: '',
        status: ''
      },
      createDialogVisible: false,
      copyConfig: null,
      pollTimer: null,
      resultsDialogVisible: false,
      selectedTaskId: null
    }
  },
  // 关键：keep-alive 场景下的激活/失活
  async activated() {
    // 防止重复启动定时器
    if (this.pollTimer) {
      return
    }
    await this.loadData()
    this.startPolling()
  },
  deactivated() {
    this.stopPolling()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          name: this.filters.name || undefined,
          status: this.filters.status || undefined
        }
        
        const { data } = await getBacktestRecords(params)
        this.list = data.items || []
        this.total = data.total || 0
      } catch (error) {
        console.error('加载回测列表失败:', error)
        this.$message.error('加载回测列表失败')
      } finally {
        this.loading = false
      }
    },
    
    resetFilters() {
      this.filters = {
        name: '',
        status: ''
      }
      this.pagination.page = 1
      this.loadData()
    },
    
    showCreateDialog() {
      this.copyConfig = null
      this.$nextTick(() => {
        this.createDialogVisible = true
      })
    },
    
    viewDetails(row) {
      this.selectedTaskId = row.id
      this.resultsDialogVisible = true
    },
    
    async copyTask(row) {
      try {
        // 先关闭对话框，确保状态清空
        this.createDialogVisible = false
        this.copyConfig = null
        
        await this.$nextTick()
        
        // 构建完整配置（优先使用config，缺失字段从冗余字段补充）
        const baseConfig = row.config || {}
        const configToCopy = {
          name: row.name,
          run_mode: row.run_mode || baseConfig.run_mode || 'normal',
          mode: baseConfig.mode || row.type || row.mode,
          strategy_class: baseConfig.strategy_class || row.strategy_class,
          data_config_id: baseConfig.data_config_id ?? row.data_config_id,
          cost_config_id: baseConfig.cost_config_id ?? row.cost_config_id,
          start: baseConfig.start_time || baseConfig.start || row.start,
          end: baseConfig.end_time || baseConfig.end || row.end,
          symbols: baseConfig.symbols || row.symbols,
          timeframes: baseConfig.timeframes || row.timeframes,
          train_days: baseConfig.train_days ?? row.train_days,
          test_days: baseConfig.test_days ?? row.test_days,
          embargo_days: baseConfig.embargo_days ?? row.embargo_days,
          cv_splits: baseConfig.cv_splits ?? row.cv_splits,
          max_workers: baseConfig.max_workers ?? row.max_workers,
          // 从config中获取参数和风控（这些只存在config中）
          strategy_params: baseConfig.strategy_params,
          param_space: baseConfig.param_space,
          risk_policies: baseConfig.risk_policies,
          params: baseConfig.params,
          // 其他字段
          market: baseConfig.market,
          quote_currency: baseConfig.quote_currency,
          ins_type: baseConfig.ins_type,
          sharpe_median_min: baseConfig.sharpe_median_min,
          sharpe_p25_min: baseConfig.sharpe_p25_min,
          mdd_median_max: baseConfig.mdd_median_max,
          min_trades_per_window: baseConfig.min_trades_per_window
        }
        
        this.copyConfig = configToCopy
        
        await this.$nextTick()
        this.createDialogVisible = true
        
        this.$message.info('配置已复制，请修改后提交')
      } catch (error) {
        console.error('复制回测失败:', error)
        this.$message.error('复制回测失败')
      }
    },
    
    async deleteTask(row) {
      try {
        await this.$confirm(`确定删除回测 "${row.name}" 吗？`, '确认删除', {
          type: 'warning'
        })
        
        await deleteBacktestRecord(row.id)
        this.$message.success('删除成功')
        await this.loadData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除回测失败:', error)
          this.$message.error('删除回测失败')
        }
      }
    },
    
    handleCreated() {
      this.loadData()
    },
    
    startPolling() {
      this.stopPolling()
      // 每5秒刷新一次，如果有运行中的任务
      this.pollTimer = setInterval(() => {
        if (document.hidden) return;
        const hasRunning = this.list.some(t => t.status === 'running' || t.status === 'pending')
        if (hasRunning) {
          this.loadData()
        }
      }, 5000)
    },
    
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    
    // 格式化方法
    formatStrategyName(fullName) {
      if (!fullName) return '-'
      return fullName.split('.').pop()
    },
    
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null || !isFinite(num)) return '-'
      return Number(num).toFixed(decimals)
    },
    
    formatPercent(value) {
      if (value === undefined || value === null || !isFinite(value)) return '-'
      return (Number(value) * 100).toFixed(2) + '%'
    },
    
    formatDateTime(timestamp) {
      if (!timestamp) return '-'
      return new Date(timestamp).toLocaleString()
    },
    
    getTrendClass(value) {
      if (value === undefined || value === null || !isFinite(value)) return ''
      return value > 0 ? 'text-success' : value < 0 ? 'text-danger' : ''
    },
    
    getTypeText(type) {
      const map = {
        'single': '单次',
        'normal': '普通',
        'parameter_search': '参数搜索',
        'walk_forward': 'Walk-Forward',
        "monte_carlo": "蒙特卡洛"
      }
      return map[type] || type
    },
    
    getTypeTagType(type) {
      const map = {
        'single': 'info',
        'parameter_search': 'warning',
        'walk_forward': 'success'
      }
      return map[type] || 'info'
    },
    
    getStatusText(status) {
      const map = {
        'pending': '排队中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败',
        'cancelled': '已取消'
      }
      return map[status] || status
    },
    
    getStatusTagType(status) {
      const map = {
        'pending': 'info',
        'running': 'warning',
        'completed': 'success',
        'failed': 'danger',
        'cancelled': 'info'
      }
      return map[status] || 'info'
    }
  }
}
</script>

<style scoped>
.backtest-list {
  padding: 20px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-bar h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

:deep(.el-progress__text) {
  font-size: 12px !important;
}
</style>

