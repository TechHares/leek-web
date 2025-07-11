<template>
  <div class="position-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.strategy_id"
                placeholder="策略ID"
                style="width: 200px;"
                class="filter-item"
              />
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
              <el-select
                v-model="listQuery.is_fake"
                placeholder="仓位"
                clearable
                style="width: 120px;"
                class="filter-item"
              >
                <el-option label="真仓位" :value="false" />
                <el-option label="虚拟仓位" :value="true" />
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
            </template>
          </el-table-column>
          <el-table-column label="累计仓位数量" align="right">
            <template #default="scope">
              {{ formatNumber(scope.row.total_sz, 12) }}
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
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_fake" type="warning">
                虚拟
              </el-tag>
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
        <el-descriptions-item label="策略ID">{{ detail.strategy_id }}</el-descriptions-item>
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
        <el-descriptions-item label="累计交易金额">{{ formatNumber(detail.total_amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="累计成交数量">{{ formatNumber(detail.total_sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="最大仓位价值">{{ formatNumber(detail.max_amount, 4) }}</el-descriptions-item>
        <el-descriptions-item label="最大持仓数量">{{ formatNumber(detail.max_sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="平均开仓价">{{ formatNumber(detail.cost_price, 12) }}</el-descriptions-item>
        <el-descriptions-item label="平均平仓价">{{ detail.close_price ? formatNumber(detail.close_price, 12) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="占资金比例">{{ formatNumber(detail.ratio*100, 1) }}%</el-descriptions-item>
        <el-descriptions-item label="最大仓位">{{ formatNumber(detail.max_sz, 4) }}</el-descriptions-item>
        <el-descriptions-item label="执行器ID">{{ detail.executor_id }}</el-descriptions-item>
        <el-descriptions-item label="假仓位">
          <el-tag :type="detail.is_fake ? 'warning' : 'info'">
            {{ detail.is_fake ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="盈亏">
          <span :class="detail.pnl >= 0 ? 'text-success' : 'text-danger'">
            {{ formatNumber(detail.pnl, 8) }}
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
import { View, Close } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber } from '@/utils/format'
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
        strategy_id: undefined,
        symbol: undefined,
        is_closed: undefined,
        ins_type: undefined,
        asset_type: undefined,
        is_fake: false
      },
      detailDialogVisible: false,
      detail: {}
    }
  },
  created() {
    this.getList()
  },
  methods: {
    insTypeDesc,
    assetTypeDesc,
    sideZh,
    getPositionSideTag,
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getPositions(this.listQuery)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        console.error('获取仓位列表失败:', error)
        this.$message.error('获取仓位列表失败')
      }
      this.listLoading = false
    },
    handleFilter() {
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