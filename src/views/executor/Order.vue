<template>
  <div class="order-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.position_id"
                placeholder="仓位ID"
                style="width: 180px;"
                class="filter-item"
              />
              <el-input
                v-model="listQuery.strategy_id"
                placeholder="策略ID"
                style="width: 120px;"
                class="filter-item"
              />
              <el-select
                v-model="listQuery.order_status"
                placeholder="订单状态"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="已创建" value="created" />
                <el-option label="已提交" value="submitted" />
                <el-option label="部分成交" value="partially_filled" />
                <el-option label="全部成交" value="filled" />
                <el-option label="已撤单" value="canceled" />
                <el-option label="被拒绝" value="rejected" />
                <el-option label="过期" value="expired" />
                <el-option label="异常" value="error" />
              </el-select>
              <el-select
                v-model="listQuery.is_open"
                placeholder="开/平仓"
                clearable
                style="width: 100px;"
                class="filter-item"
              >
                <el-option label="开仓" :value="true" />
                <el-option label="平仓" :value="false" />
              </el-select>
              <el-select
                v-model="listQuery.is_fake"
                placeholder="仓位类型"
                clearable
                style="width: 100px;"
                class="filter-item"
              >
                <el-option label="真仓位" :value="false" />
                <el-option label="虚拟仓位" :value="true" />
              </el-select>
              <el-input
                v-model="listQuery.market_order_id"
                placeholder="市场订单ID"
                style="width: 140px;"
                class="filter-item"
              />
              <el-input
                v-model="listQuery.executor_id"
                placeholder="交易器ID"
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
          size="small"
          align="left"
          border
          fit
          highlight-current-row
          :row-class-name="tableRowClassName"
        >
          <el-table-column align="center" label="ID">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="策略ID">
            <template #default="scope">
              {{ scope.row.strategy_name }}
            </template>
          </el-table-column>
          <el-table-column label="交易器">
            <template #default="scope">
              {{ scope.row.exec_name || scope.row.executor_id }}
            </template>
          </el-table-column>
          <el-table-column label="订单状态">
            <template #default="scope">
              <el-tag :type="getOrderStatusType(scope.row.order_status)">
                {{ getOrderStatusText(scope.row.order_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="交易标的">
            <template #default="scope">
              {{ scope.row.symbol }} - {{ scope.row.quote_currency }}
            </template>
          </el-table-column>
          <el-table-column label="方向" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.side === '1' ? 'success' : 'danger'">
                {{ sideZh(scope.row.side) }}
              </el-tag>
              <el-tag :type="scope.row.is_open ? 'success' : 'info'">
                {{ scope.row.is_open ? '开仓' : '平仓' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.settle_amount || scope.row.order_amount, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="价格" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.order_price || scope.row.execution_price, 8) }}
            </template>
          </el-table-column>
          <el-table-column label="手续费" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.fee, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="盈亏" align="right">
            <template #default="scope">
              <span :class="scope.row.pnl >= 0 ? 'text-success' : 'text-danger'">
                {{scope.row.pnl > 0 ? "+" : ""}}{{ formatNumber(scope.row.pnl, 12) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="订单时间" align="center">
            <template #default="scope">
              {{ formatDate(scope.row.order_time) }}
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
      v-model="dialogVisible"
      title="订单详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单ID">{{ currentOrder.id }}</el-descriptions-item>
        <el-descriptions-item label="策略">{{ currentOrder.strategy_name }}</el-descriptions-item>
        <el-descriptions-item label="信号ID">{{ currentOrder.signal_id }}</el-descriptions-item>
        <el-descriptions-item label="仓位ID">{{ currentOrder.position_id }}</el-descriptions-item>
        <el-descriptions-item label="执行订单ID">{{ currentOrder.exec_order_id }}</el-descriptions-item>
        <el-descriptions-item label="执行器">{{ currentOrder.exec_name }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getOrderStatusType(currentOrder.order_status)">
            {{ getOrderStatusText(currentOrder.order_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易标的">
        <el-tag type="info" class="ml-2">{{ assetTypeDesc(currentOrder.asset_type) }}</el-tag>
        {{ currentOrder.symbol }} - {{ currentOrder.quote_currency }}
        </el-descriptions-item>
        <el-descriptions-item label="交易品种">
          <el-tag>{{ insTypeDesc(currentOrder.ins_type) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易方向">
          <el-tag :type="currentOrder.side === 'LONG' ? 'success' : 'danger'">
            {{ sideZh(currentOrder.side) }}
          </el-tag>
          <el-tag :type="currentOrder.is_open ? 'success' : 'info'" class="ml-2">
            {{ currentOrder.is_open ? '开仓' : '平仓' }}
          </el-tag>
          <el-tag v-if="currentOrder.is_fake" type="warning" class="ml-2">虚拟</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单金额">
          {{ formatNumber(currentOrder.order_amount, 4) }}
        </el-descriptions-item>
        <el-descriptions-item label="成交金额">
          {{ formatNumber(currentOrder.settle_amount, 4) }}
        </el-descriptions-item>
        <el-descriptions-item label="订单价格">{{ formatNumber(currentOrder.order_price, 12) }}</el-descriptions-item>
        <el-descriptions-item label="成交均价">{{ formatNumber(currentOrder.execution_price, 12) }}</el-descriptions-item>
        <el-descriptions-item label="手续费">{{ formatNumber(currentOrder.fee, 8) }}</el-descriptions-item>
        <el-descriptions-item label="盈亏">
          <span :class="currentOrder.pnl >= 0 ? 'text-success' : 'text-danger'">
            {{ formatNumber(currentOrder.pnl, 4) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="杠杆">{{ formatNumber(currentOrder.leverage, 2) }}x</el-descriptions-item>
        <el-descriptions-item label="订单数量">{{ formatNumber(currentOrder.sz * currentOrder.sz_value, 4) }}</el-descriptions-item>
        <el-descriptions-item label="交易模式">{{ tradeModeText(currentOrder.trade_mode) }}</el-descriptions-item>
        <el-descriptions-item label="摩擦成本">{{ formatNumber(currentOrder.friction, 4) }}</el-descriptions-item>
        <el-descriptions-item label="是否虚拟">{{ currentOrder.is_fake ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="订单时间">{{ formatDate(currentOrder.order_time) }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ formatDate(currentOrder.finish_time) }}</el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ orderTypeText(currentOrder.order_type) }}</el-descriptions-item>
        <el-descriptions-item label="市场订单ID">{{ currentOrder.market_order_id }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(currentOrder.updated_at) }}</el-descriptions-item>
        <el-descriptions-item label="扩展信息" :span="2">{{ currentOrder.extra || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script>
import { getOrders, getOrder } from '@/api/executor'
import { View } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber, filterEmptyParams } from '@/utils/format'
import { getOrderStatusType, getOrderStatusText, sideZh, insTypeZh, assetTypeZh, orderTypeText, tradeModeText, insTypeDesc, assetTypeDesc } from '@/utils/enum'

export default {
  name: 'Order',
  components: { View, Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        position_id: undefined,
        strategy_id: undefined,
        order_status: undefined,
        is_open: undefined,
        is_fake: false,
        market_order_id: undefined,
        executor_id: undefined,
        project_id: undefined
      },
      dialogVisible: false,
      currentOrder: {}
    }
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        // 过滤掉空字符串，避免后端解析错误
        const queryParams = filterEmptyParams(this.listQuery)
        
        const { data } = await getOrders(queryParams)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        console.error('获取订单列表失败:', error)
        this.$message.error('获取订单列表失败')
      }
      this.listLoading = false
    },
    handleFilter() {
      // 重置页码到第一页
      this.listQuery.page = 1
      this.getList()
    },
    async handleDetail(row) {
      try {
        const { data } = await getOrder(row.id)
        this.currentOrder = data
        this.dialogVisible = true
      } catch (error) {
        console.error('获取订单详情失败:', error)
        this.$message.error('获取订单详情失败')
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null) return '-'
      return Number(num).toFixed(decimals).replace(/\.?0+$/, '')
    },
    tableRowClassName({ row }) {
      return row.is_fake ? 'fake-row' : ''
    },
    getOrderStatusType,
    getOrderStatusText,
    sideZh,
    insTypeZh,
    assetTypeZh,
    assetTypeDesc,
    orderTypeText,
    tradeModeText,
    insTypeDesc
  },
  created() {
    this.getList()
  }
}
</script>

<style lang="scss" scoped>
.order-page {
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
.el-table {
  font-size: 14px;
}
:deep(.el-table .fake-row .cell) {
  color: rgb(17, 130, 243) !important;
}
</style> 