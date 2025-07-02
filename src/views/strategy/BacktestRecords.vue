<template>
  <div class="backtest-records-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.name"
                placeholder="回测名称"
                style="width: 180px;"
                class="filter-item"
              />
              <el-input
                v-model="listQuery.strategy_name"
                placeholder="策略名称"
                style="width: 150px;"
                class="filter-item"
              />
              <el-select
                v-model="listQuery.status"
                placeholder="回测状态"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="运行中" value="running" />
                <el-option label="已完成" value="completed" />
                <el-option label="失败" value="failed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 240px;"
                class="filter-item"
                @change="handleDateChange"
              />
              <el-button type="primary" @click="handleFilter" class="filter-item">查询</el-button>
            </div>
            <div class="right-actions">
              <el-button
                type="primary"
                @click="handleCreateBacktest"
              >
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
        <el-table
          :data="list || []"
          style="width: 100%;"
          size="small"
          align="left"
          border
          fit
          highlight-current-row
        >
          <el-table-column align="center" label="ID" width="80">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="回测名称" min-width="150">
            <template #default="scope">
              <el-link type="primary" @click="handleViewDetail(scope.row)">
                {{ scope.row.name }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="策略名称" min-width="120">
            <template #default="scope">
              {{ scope.row.strategy_name }}
            </template>
          </el-table-column>
          <el-table-column label="回测状态" align="center" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="回测周期" align="center" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.start_time) }} ~ {{ formatDate(scope.row.end_time) }}
            </template>
          </el-table-column>
          <el-table-column label="总收益率" align="right" width="120">
            <template #default="scope">
              <span :class="scope.row.total_return >= 0 ? 'text-success' : 'text-danger'">
                {{ scope.row.total_return >= 0 ? '+' : '' }}{{ formatPercent(scope.row.total_return) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="年化收益率" align="right" width="120">
            <template #default="scope">
              <span :class="scope.row.annual_return >= 0 ? 'text-success' : 'text-danger'">
                {{ scope.row.annual_return >= 0 ? '+' : '' }}{{ formatPercent(scope.row.annual_return) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="最大回撤" align="right" width="100">
            <template #default="scope">
              <span class="text-danger">
                {{ formatPercent(scope.row.max_drawdown) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="夏普比率" align="right" width="100">
            <template #default="scope">
              {{ formatNumber(scope.row.sharpe_ratio, 2) }}
            </template>
          </el-table-column>
          <el-table-column label="总交易次数" align="center" width="100">
            <template #default="scope">
              {{ scope.row.total_trades }}
            </template>
          </el-table-column>
          <el-table-column label="胜率" align="right" width="80">
            <template #default="scope">
              {{ formatPercent(scope.row.win_rate) }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" width="160">
            <template #default="scope">
              {{ formatDateTime(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="200">
            <template #default="scope">
              <el-tooltip content="查看详情" placement="top">
                <el-button
                  size="small"
                  @click="handleViewDetail(scope.row)"
                  circle
                >
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看回测" placement="top">
                <el-button
                  size="small"
                  type="primary"
                  @click="handleViewBacktest(scope.row)"
                  circle
                >
                  <el-icon><DataAnalysis /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button
                  size="small"
                  type="danger"
                  @click="handleDelete(scope.row)"
                  circle
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="listQuery.page"
      v-model:limit="listQuery.size"
      @pagination="getList"
    />

    <!-- 详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="回测详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="回测ID">{{ currentRecord.id }}</el-descriptions-item>
        <el-descriptions-item label="回测名称">{{ currentRecord.name }}</el-descriptions-item>
        <el-descriptions-item label="策略名称">{{ currentRecord.strategy_name }}</el-descriptions-item>
        <el-descriptions-item label="回测状态">
          <el-tag :type="getStatusType(currentRecord.status)">
            {{ getStatusText(currentRecord.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDateTime(currentRecord.start_time) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(currentRecord.end_time) }}</el-descriptions-item>
        <el-descriptions-item label="初始资金">{{ formatNumber(currentRecord.initial_capital, 2) }}</el-descriptions-item>
        <el-descriptions-item label="最终资金">{{ formatNumber(currentRecord.final_capital, 2) }}</el-descriptions-item>
        <el-descriptions-item label="总收益率">
          <span :class="currentRecord.total_return >= 0 ? 'text-success' : 'text-danger'">
            {{ currentRecord.total_return >= 0 ? '+' : '' }}{{ formatPercent(currentRecord.total_return) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="年化收益率">
          <span :class="currentRecord.annual_return >= 0 ? 'text-success' : 'text-danger'">
            {{ currentRecord.annual_return >= 0 ? '+' : '' }}{{ formatPercent(currentRecord.annual_return) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="最大回撤">
          <span class="text-danger">{{ formatPercent(currentRecord.max_drawdown) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="夏普比率">{{ formatNumber(currentRecord.sharpe_ratio, 2) }}</el-descriptions-item>
        <el-descriptions-item label="总交易次数">{{ currentRecord.total_trades }}</el-descriptions-item>
        <el-descriptions-item label="胜率">{{ formatPercent(currentRecord.win_rate) }}</el-descriptions-item>
        <el-descriptions-item label="平均持仓时间">{{ currentRecord.avg_hold_time }}</el-descriptions-item>
        <el-descriptions-item label="最大单笔盈利">{{ formatNumber(currentRecord.max_profit, 2) }}</el-descriptions-item>
        <el-descriptions-item label="最大单笔亏损">{{ formatNumber(currentRecord.max_loss, 2) }}</el-descriptions-item>
        <el-descriptions-item label="盈亏比">{{ formatNumber(currentRecord.profit_loss_ratio, 2) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(currentRecord.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ formatDateTime(currentRecord.completed_at) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentRecord.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script>
import { getBacktestRecords, getBacktestRecord, deleteBacktestRecord } from '@/api/backtest'
import { View, Plus, DataAnalysis, Delete } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber } from '@/utils/format'

export default {
  name: 'BacktestRecords',
  components: { View, Plus, DataAnalysis, Delete, Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        name: undefined,
        strategy_name: undefined,
        status: undefined,
        start_date: undefined,
        end_date: undefined,
        project_id: undefined
      },
      dateRange: null,
      dialogVisible: false,
      currentRecord: {}
    }
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getBacktestRecords(this.listQuery)
        this.list = data.items
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
    handleViewBacktest(row) {
      this.$router.push(`/strategy/backtest/${row.id}`)
    },
    handleCreateBacktest() {
      this.$router.push('/strategy/backtest/create')
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
    formatPercent(value) {
      if (value === undefined || value === null) return '-'
      return (Number(value) * 100).toFixed(2) + '%'
    },
    getStatusType(status) {
      const statusMap = {
        running: 'warning',
        completed: 'success',
        failed: 'danger',
        cancelled: 'info'
      }
      return statusMap[status] || 'info'
    },
    getStatusText(status) {
      const statusMap = {
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
      return statusMap[status] || status
    }
  },
  created() {
    this.getList()
  }
}
</script>

<style lang="scss" scoped>
.backtest-records-page {
  padding: 20px;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}
.header-bar {
  .table-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .left-actions {
    display: flex;
    gap: 8px;
  }
}
.filter-item {
  margin-right: 8px;
}
.text-center {
  text-align: center;
}
.text-success {
  color: #67c23a;
}
.text-danger {
  color: #f56c6c;
}
.el-table {
  font-size: 14px;
}
</style> 