<template>
  <div class="position-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-select
                v-model="listQuery.strategy_ids"
                placeholder="选择策略"
                clearable
                filterable
                multiple
                collapse-tags
                style="width: 260px;"
                class="filter-item"
              >
                <el-option
                  v-for="item in strategyOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-input
                v-model="listQuery.symbol"
                placeholder="交易标的"
                style="width: 200px;"
                class="filter-item"
              />
              <el-select
                v-model="listQuery.is_closed"
                placeholder="仓位状态"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="持仓中" :value="false" />
                <el-option label="已平仓" :value="true" />
              </el-select>
              <el-select
                v-model="listQuery.ins_type"
                placeholder="产品类型"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="现货" :value="1" />
                <el-option label="杠杆" :value="2" />
                <el-option label="合约" :value="3" />
                <el-option label="期货" :value="4" />
                <el-option label="期权" :value="5" />
              </el-select>
              <el-select
                v-model="listQuery.asset_type"
                placeholder="资产类型"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="股票" value="stock" />
                <el-option label="期货" value="futures" />
                <el-option label="加密货币" value="crypto" />
                <el-option label="外汇" value="forex" />
                <el-option label="指数" value="index" />
                <el-option label="债券" value="bond" />
                <el-option label="商品" value="commodity" />
                <el-option label="期权" value="option" />
              </el-select>

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
          align="center"
          border
          fit
          highlight-current-row
          :row-class-name="tableRowClassName"
        >
          <el-table-column label="ID" align="center">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="交易标的" >
            <template #default="scope" align="center">
              <el-tag type="info">{{ insTypeDesc(scope.row.ins_type) }}</el-tag>
              {{ scope.row.symbol }} - {{ scope.row.quote_currency }}
            </template>
          </el-table-column>
          <el-table-column label="策略" align="center">
            <template #default="scope">
              {{ scope.row.instance_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="方向/杠杆" align="center">
            <template #default="scope">
              <el-tag :type="getPositionSideTag(scope.row.side)">
                {{ sideZh(scope.row.side) }}
              </el-tag>
              <el-tag :type="scope.row.leverage >= 1 ? 'info' : 'danger'">
                {{ formatNumber(scope.row.leverage, 2) }}x
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="累计交易金额" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.total_amount, 4) }}
              <span v-if="scope.row.virtual_positions && scope.row.virtual_positions.length > 0">
                (+{{ formatNumber(getTotalAmountWithVirtual(scope.row), 4) }})
              </span>
            </template>
          </el-table-column>
          <el-table-column label="累计仓位数量" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.total_sz, 12) }}
              <span v-if="scope.row.virtual_positions && scope.row.virtual_positions.length > 0">
                (+{{ formatNumber(getTotalSzWithVirtual(scope.row), 12) }})
              </span>
            </template>
          </el-table-column>
          <el-table-column label="平均开仓价" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.cost_price, 12) }}
            </template>
          </el-table-column>
          <el-table-column label="已实现盈亏" align="right">
            <template #default="scope">
              <span :class="scope.row.pnl >= 0 ? 'text-success' : 'text-danger'">
                {{ formatNumber(scope.row.pnl, 8) }}
              </span>
              <span v-if="scope.row.virtual_positions && scope.row.virtual_positions.length > 0" :class="getTotalPnlWithVirtual(scope.row) >= 0 ? 'text-success' : 'text-danger'">
                (<span v-if="getTotalPnlWithVirtual(scope.row) >= 0">+</span>{{ formatNumber(getTotalPnlWithVirtual(scope.row), 8) }})
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.is_closed ? 'info' : 'success'">
                {{ scope.row.is_closed ? '已平仓' : '持仓中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开仓时间" align="center">
            <template #default="scope">
              {{ formatDate(scope.row.open_time) }}
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
              <el-tooltip v-if="!scope.row.is_closed" content="平仓" placement="top">
                <el-button
                  size="small"
                  type="danger"
                  @click="handleClose(scope.row)"
                  circle
                >
                  <el-icon><Close /></el-icon>
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
      title="仓位详情"
      v-model="detailDialogVisible"
      width="900px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="策略">{{ detail.instance_name }}({{ detail.strategy_id }})</el-descriptions-item>
        <el-descriptions-item label="策略实例">{{ detail.strategy_instance_id }}</el-descriptions-item>
        <el-descriptions-item label="交易标的">{{ detail.symbol }} - {{ detail.quote_currency }}</el-descriptions-item>
        <el-descriptions-item label="产品类型"><el-tag type="success">{{ assetTypeDesc(detail.asset_type) }}</el-tag><el-tag type="info">{{ insTypeDesc(detail.ins_type) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="方向">
          <el-tag :type="getPositionSideTag(detail.side)">
            {{ sideZh(detail.side) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="金额">{{ formatNumber(detail.amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ formatNumber(detail.sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="累计交易金额">
          {{ formatNumber(detail.total_amount, 4) }}
          <span v-if="detail.virtual_positions && detail.virtual_positions.length > 0">
            (+{{ formatNumber(getTotalAmountWithVirtual(detail), 4) }})
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="累计成交数量">
          {{ formatNumber(detail.total_sz, 4) }}
          <span v-if="detail.virtual_positions && detail.virtual_positions.length > 0">
            (+{{ formatNumber(getTotalSzWithVirtual(detail), 4) }})
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="最大仓位价值">{{ formatNumber(detail.max_amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="最大持仓数量">{{ formatNumber(detail.max_sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="平均开仓价">{{ formatNumber(detail.cost_price, 12) }}</el-descriptions-item>
        <el-descriptions-item label="平均平仓价">{{ detail.close_price ? formatNumber(detail.close_price, 12) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="占资金比例">{{ formatNumber(detail.ratio*100, 1) }}%</el-descriptions-item>
        <el-descriptions-item label="最大仓位">{{ formatNumber(detail.max_sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="执行器ID">{{ detail.executor_id }}</el-descriptions-item>
        <el-descriptions-item label="虚拟仓位">
          <el-tag v-if="detail.virtual_positions && detail.virtual_positions.length > 0" type="warning">
            有虚拟仓位({{ getVirtualPositionTotal(detail.virtual_positions) }})
          </el-tag>
          <el-tag v-else type="info">无</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="盈亏">
          <span :class="detail.pnl >= 0 ? 'text-success' : 'text-danger'">
            {{ formatNumber(detail.pnl, 8) }}
          </span>
          <span v-if="detail.virtual_positions && detail.virtual_positions.length > 0" :class="getTotalPnlWithVirtual(detail) >= 0 ? 'text-success' : 'text-danger'">
            (<span v-if="getTotalPnlWithVirtual(detail) >= 0">+</span>
            {{ formatNumber(getTotalPnlWithVirtual(detail), 8) }})
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="手续费">{{ formatNumber(detail.fee, 12) }}</el-descriptions-item>
        <el-descriptions-item label="摩擦成本">{{ formatNumber(detail.friction, 12) }}</el-descriptions-item>
        <el-descriptions-item label="杠杆">{{ formatNumber(detail.leverage, 2) }}x</el-descriptions-item>
        <el-descriptions-item label="平仓时间">{{ detail.close_time ? formatDate(detail.close_time) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail.is_closed ? 'info' : 'success'">
            {{ detail.is_closed ? '已平仓' : '持仓中' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatDate(detail.open_time) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(detail.updated_at) }}</el-descriptions-item>
        <el-descriptions-item label="仓位分布" v-if="!detail.is_closed">{{ detail.executor_sz ? JSON.stringify(detail.executor_sz, null, 2) : '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 虚拟仓位详情 -->
      <div v-if="detail.virtual_positions && detail.virtual_positions.length > 0" style="margin-top: 20px;">
        <h4 style="margin-bottom: 15px; color: #e6a23c;">虚拟仓位详情</h4>
        <el-table :data="detail.virtual_positions" border size="small" style="width: 100%;">
          <el-table-column label="风控策略ID" prop="policy_id" width="120" />
          <el-table-column label="信号ID" prop="signal_id" width="120" />
          <el-table-column label="仓位数量" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.sz, 8) }}
            </template>
          </el-table-column>
          <el-table-column label="仓位金额" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.amount, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="仓位比例" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.ratio * 100, 2) }}%
            </template>
          </el-table-column>
          <el-table-column label="开仓成本价" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.cost_price, 12) }}
            </template>
          </el-table-column>
          <el-table-column label="平仓成本价" align="right">
            <template #default="scope">
              {{ scope.row.close_price ? formatNumber(scope.row.close_price, 12) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="已平仓数量" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.closed_sz, 8) }}
            </template>
          </el-table-column>
          <el-table-column label="盈亏" align="right">
            <template #default="scope">
              <span :class="scope.row.pnl >= 0 ? 'text-success' : 'text-danger'">
                {{ formatNumber(scope.row.pnl, 8) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center">
            <template #default="scope">
              {{ formatDate(scope.row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="text-end">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            v-if="!detail.is_closed"
            type="danger"
            @click="handleClose(detail)"
          >
            平仓
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getPositions, getPosition, closePosition } from '@/api/position'
import { getStrategies } from '@/api/strategy'
import { View, Close } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber, filterEmptyParams } from '@/utils/format'
import { insTypeDesc, assetTypeDesc, sideZh, getPositionSideTag  } from '@/utils/enum'
export default {
  name: 'Position',
  components: { View, Close, Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        strategy_ids: [],
        symbol: undefined,
        is_closed: undefined,
        ins_type: undefined,
        asset_type: undefined,

      },
      detailDialogVisible: false,
      detail: {},
      strategyOptions: []
    }
  },
  created() {
    this.getList()
    this.getStrategies()
  },
  methods: {
    insTypeDesc,
    assetTypeDesc,
    sideZh,
    getPositionSideTag,
    async getList() {
      this.listLoading = true
      try {
        // 过滤掉空字符串，避免后端解析错误
        const queryParams = filterEmptyParams(this.listQuery)
        if (Array.isArray(queryParams.strategy_ids) && queryParams.strategy_ids.length > 0) {
          queryParams.strategy_ids = queryParams.strategy_ids.join(',')
        } else {
          queryParams.strategy_ids = undefined
        }
        
        const { data } = await getPositions(queryParams)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        console.error('获取仓位列表失败:', error)
        this.$message.error('获取仓位列表失败')
      }
      this.listLoading = false
    },
    async getStrategies() {
      try {
        const { data } = await getStrategies()
        this.strategyOptions = data
      } catch (error) {
        console.error('获取策略列表失败:', error)
      }
    },
    handleFilter() {
      // 重置页码到第一页
      this.listQuery.page = 1
      this.getList()
    },
    async handleDetail(row) {
      try {
        const { data } = await getPosition(row.id)
        this.detail = data
        this.detailDialogVisible = true
      } catch (error) {
        console.error('获取仓位详情失败:', error)
        this.$message.error('获取仓位详情失败')
      }
    },
    async handleClose(row) {
      try {
        await this.$confirm('确认平仓该仓位(平仓不会立即修改仓位状态，需要等待策略执行器处理，请勿重复平仓)?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await closePosition(row.id)
        this.$message.success('平仓成功')
        this.getList()
        if (this.detailDialogVisible) {
          this.detailDialogVisible = false
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('平仓失败')
        }
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    formatNumber,
    getVirtualPositionTotal(virtualPositions) {
      if (!virtualPositions || virtualPositions.length === 0) {
        return 0
      }
      // 计算虚拟仓位的总数量
      const total = virtualPositions.reduce((sum, vp) => {
        return sum + (parseFloat(vp.sz) || 0)
      }, 0)
      return formatNumber(total, 2)
    },
    getTotalAmountWithVirtual(position) {
      return position.virtual_positions ? position.virtual_positions.reduce((sum, vp) => {
        return sum + (parseFloat(vp.amount) || 0)
      }, 0) : 0
    },
    getTotalSzWithVirtual(position) {
      return position.virtual_positions ? position.virtual_positions.reduce((sum, vp) => {
        return sum + (parseFloat(vp.sz) || 0)
      }, 0) : 0
    },
    getTotalPnlWithVirtual(position) {
      return position.virtual_positions ? position.virtual_positions.reduce((sum, vp) => {
        return sum + (parseFloat(vp.pnl) || 0)
      }, 0) : 0
    },
    tableRowClassName({ row }) {
      return row.is_fake ? 'fake-row' : ''
    }
  }
}
</script>

<style lang="scss" scoped>
.position-page {
  padding: 20px;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.3rem;
  font-weight: 500;
  
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