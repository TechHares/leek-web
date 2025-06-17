<template>
  <div class="execution-info-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.signal_id"
                placeholder="信号ID"
                style="width: 180px;"
                class="filter-item"
              />
              <el-input
                v-model="listQuery.strategy_id"
                placeholder="策略ID"
                style="width: 120px;"
                class="filter-item"
              />
              <el-button type="primary" @click="handleFilter" class="filter-item">查询</el-button>
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
          size="default"
          border
          fit
          highlight-current-row
        >
          <el-table-column align="center" label="ID">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="信号ID">
            <template #default="scope">
              {{ scope.row.signal_id }}
            </template>
          </el-table-column>
          <el-table-column label="策略ID">
            <template #default="scope">
              {{ scope.row.strategy_name }}
            </template>
          </el-table-column>
          <el-table-column label="开仓金额" align="right">
            <template #default="scope">
              {{ scope.row.open_amount == 0 ? '-' : formatNumber(scope.row.open_amount, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="开仓比例" align="right">
            <template #default="scope">
              {{ scope.row.open_ratio == 0 ? '-' : formatNumber(scope.row.open_ratio * 100, 1) + '%' }}
            </template>
          </el-table-column>
          <el-table-column label="实际比例" align="right">
            <template #default="scope">
              {{ scope.row.actual_ratio == null ? '-' : formatNumber(scope.row.actual_ratio * 100, 1) + '%' }}
            </template>
          </el-table-column>
          <el-table-column label="实际金额" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.actual_amount, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="订单类型">
            <template #default="scope">
              <el-tag
                :type="scope.row.order_type === 1 ? 'success' : 'info'"
                disable-transitions
                size="small"
              >
                {{ orderTypeText(scope.row.order_type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="交易模式">
            <template #default="scope">
              <el-tag
                :type="scope.row.trade_mode === 'isolated' ? 'warning' : 'info'"
                disable-transitions
                size="small"
              >
                {{ tradeModeText(scope.row.trade_mode) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="实际盈亏">
            <template #default="scope">
              <template v-if="scope.row.actual_pnl !== null && scope.row.actual_pnl !== undefined">
                <span :class="scope.row.actual_pnl >= 0 ? 'text-success' : 'text-danger'">
                  {{ scope.row.actual_pnl > 0 ? "+" : "" }}{{ formatNumber(scope.row.actual_pnl, 12) }}
                </span>
              </template>
              <template v-else>
                -
              </template>
            </template>
          </el-table-column>
          <el-table-column label="创建时间">
            <template #default="scope">
              {{ formatDate(scope.row.created_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center">
            <template #default="scope"> 
              <el-tooltip content="查看详情" placement="top">
                <el-button
                  size="small"
                  @click="handleDetail(scope.row)"
                  circle
                >
                  <el-icon><View /></el-icon>
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
      title="执行详情"
      v-model="detailDialogVisible"
      width="1000px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="信号ID">{{ detail.signal_id }}</el-descriptions-item>
        <el-descriptions-item label="策略">{{ detail.strategy_name }} ({{ detail.strategy_id }} @ {{ detail.strategy_instant_id }})</el-descriptions-item>
        <el-descriptions-item label="目标执行器ID">{{ detail.target_executor_id }}</el-descriptions-item>
        <el-descriptions-item label="开仓金额">{{ formatNumber(detail.open_amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="开仓比例">{{ formatNumber(detail.open_ratio * 100, 1) }}%</el-descriptions-item>
        <el-descriptions-item label="实际比例">{{ detail.actual_ratio == null ? '-' : formatNumber(detail.actual_ratio * 100, 1) + '%' }}</el-descriptions-item>
        <el-descriptions-item label="实际金额">{{ formatNumber(detail.actual_amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="实际盈亏">
        <template #default="scope">
              <template v-if="detail.actual_pnl !== null && detail.actual_pnl !== undefined">
                <span :class="detail.actual_pnl >= 0 ? 'text-success' : 'text-danger'">
                  {{ detail.actual_pnl > 0 ? "+" : "" }}{{ formatNumber(detail.actual_pnl, 12) }}
                </span>
              </template>
              <template v-else>
                -
              </template>
            </template>
        </el-descriptions-item>
        <el-descriptions-item label="杠杆">{{ formatNumber(detail.leverage, 2) }}x</el-descriptions-item>
        <el-descriptions-item label="订单类型">
          <el-tag
            :type="detail.order_type === 1 ? 'success' : 'info'"
            disable-transitions
            size="small"
          >
            {{ orderTypeText(detail.order_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易品种类型">
          <el-tag
            :type="detail.trade_type === 3 ? 'warning' : 'success'"
            disable-transitions
            size="small"
          >
            {{ insTypeDesc(detail.trade_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易模式">
          <el-tag
            :type="detail.trade_mode === 'isolated' ? 'warning' : 'info'"
            disable-transitions
            size="small"
          >
            {{ tradeModeText(detail.trade_mode) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detail.created_time) }}</el-descriptions-item>
        <el-descriptions-item label="扩展信息" :span="2">
          {{ detail.extra ? JSON.stringify(detail.extra, null, 2) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="执行资产列表" :span="2">
          <el-table :data="detail.execution_assets" border style="width: 100%;">
            <el-table-column prop="asset_type" label="交易标的">
              <template #default="scope">
                {{ scope.row.symbol }}-{{ scope.row.quote_currency }}
              </template>
            </el-table-column>
            <el-table-column prop="side" label="方向">
              <template #default="scope">
                <el-tag
                  :type="scope.row.side === '多' ? 'success' : 'danger'"
                  disable-transitions
                  size="small"
                >
                  {{ sideZh(scope.row.side) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="asset_type" label="资产类型" >
              <template #default="scope">
                <el-tag
                  :type="scope.row.asset_type === '加密货币' ? 'success' : 'info'"
                  disable-transitions
                  size="small"
                >
                  {{ assetTypeDesc(scope.row.asset_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ins_type" label="交易品种" >
              <template #default="scope">
                <el-tag
                  :type="scope.row.ins_type === '合约' ? 'info' : 'success'"
                  disable-transitions
                  size="small"
                >
                  {{ insTypeDesc(scope.row.ins_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" align="right" >
              <template #default="scope">
                {{ formatNumber(scope.row.price, 18) }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" align="right">
              <template #default="scope">
                {{ formatNumber(scope.row.amount, 4) || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="sz" label="数量" align="right">
              <template #default="scope">
                {{ formatNumber(scope.row.sz, 4) || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="ratio" label="比例" align="right" >
              <template #default="scope">
                {{ formatNumber(scope.row.ratio * 100, 1) }}%
              </template>
            </el-table-column>
          </el-table>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="text-end">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getExecutionOrders } from '@/api/executor'
import { View } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber } from '@/utils/format'
import { sideZh, insTypeZh, assetTypeZh, orderTypeText, tradeModeText, insTypeDesc, assetTypeDesc } from '@/utils/enum'

export default {
  name: 'ExecutionInfo',
  components: { View, Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        signal_id: undefined,
        strategy_id: undefined,
        project_id: undefined
      },
      detailDialogVisible: false,
      detail: {}
    }
  },
  methods: {
    formatNumber,
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getExecutionOrders(this.listQuery)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        console.error('获取执行信息列表失败:', error)
        this.$message.error('获取执行信息列表失败')
      }
      this.listLoading = false
    },
    handleFilter() {
      this.getList()
    },
    handleDetail(row) {
      this.detail = row
      this.detailDialogVisible = true
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    sideZh,
    insTypeZh,
    assetTypeZh,
    orderTypeText,
    tradeModeText,
    insTypeDesc,
    assetTypeDesc
  },
  created() {
    this.getList()
  }
}
</script>

<style lang="scss" scoped>
.execution-info-page {
  padding: 20px;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  width: 100%;
}
.el-table {
  width: 100% !important;
  font-size: 14px;
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
.text-end {
  text-align: right;
}
.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
.text-success {
  color: #67c23a;
}
.text-danger {
  color: #f56c6c;
}
</style> 