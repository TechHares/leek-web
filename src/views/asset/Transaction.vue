<template>
  <div class="transaction-page">
    <!-- 资产状态卡片 -->
    <el-card class="mb-4" v-if="positionData && positionData.total_amount !== 0" shadow="hover">
      <template #header>
        <div class="header-bar">
          <span class="card-title">资产状态</span>
          <el-button type="warning" @click="resetPositionState" :loading="resettingPositionState">重置资产状态</el-button>
        </div>
      </template>
      <div class="statistics-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.total_amount)">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    总资产
                    <el-tooltip effect="dark" content="当前账户总资产金额" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>24小时变化</span>
                  <span :class="getChangeRateClass(positionData?.total_amount_change)">
                    {{ formatChangeRate(positionData?.total_amount_change) }}
                    <el-icon v-if="positionData?.total_amount_change !== 0">
                      <CaretTop v-if="positionData?.total_amount_change > 0" />
                      <CaretBottom v-else-if="positionData?.total_amount_change < 0" />
                    </el-icon>
                  </span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.pnl)" :value-style="{ color: getPnlColor(positionData?.pnl) }">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    盈亏
                    <el-tooltip effect="dark" content="当前持仓的盈亏情况" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>24小时变化</span>
                  <span :class="getChangeRateClass(positionData?.pnl_change)">
                    {{ formatChangeRate(positionData?.pnl_change) }}
                    <el-icon v-if="positionData?.pnl_change !== 0">
                      <CaretTop v-if="positionData?.pnl_change > 0" />
                      <CaretBottom v-else-if="positionData?.pnl_change < 0" />
                    </el-icon>
                  </span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.fee)">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    手续费
                    <el-tooltip effect="dark" content="累计产生的交易手续费" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>24小时变化</span>
                  <span :class="getChangeRateClass(positionData?.fee_change)">
                    {{ formatChangeRate(positionData?.fee_change) }}
                    <el-icon v-if="positionData?.fee_change !== 0">
                      <CaretTop v-if="positionData?.fee_change > 0" />
                      <CaretBottom v-else-if="positionData?.fee_change < 0" />
                    </el-icon>
                  </span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.friction)">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    摩擦成本
                    <el-tooltip effect="dark" content="交易过程中的摩擦成本" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>24小时变化</span>
                  <span :class="getChangeRateClass(positionData?.friction_change)">
                    {{ formatChangeRate(positionData?.friction_change) }}
                    <el-icon v-if="positionData?.friction_change !== 0">
                      <CaretTop v-if="positionData?.friction_change > 0" />
                      <CaretBottom v-else-if="positionData?.friction_change < 0" />
                    </el-icon>
                  </span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row :gutter="16" class="mt-0">
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.virtual_pnl)">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    虚拟盈亏
                    <el-tooltip effect="dark" content="模拟交易的盈亏情况" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>24小时变化</span>
                  <span :class="getChangeRateClass(positionData?.virtual_pnl_change)">
                    {{ formatChangeRate(positionData?.virtual_pnl_change) }}
                    <el-icon v-if="positionData?.virtual_pnl_change !== 0">
                      <CaretTop v-if="positionData?.virtual_pnl_change > 0" />
                      <CaretBottom v-else-if="positionData?.virtual_pnl_change < 0" />
                    </el-icon>
                  </span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="formatAmount(positionData?.activate_amount)">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    可用余额
                    <el-tooltip effect="dark" content="可用于交易的资金余额" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>可交易资金</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="positionData?.position_count || 0">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    持仓数
                    <el-tooltip effect="dark" content="当前活跃的仓位数量" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>活跃仓位</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="statistic-card">
              <el-statistic :value="positionData?.asset_count || 0">
                <template #title>
                  <div style="display: inline-flex; align-items: center">
                    资产数量
                    <el-tooltip effect="dark" content="当前持仓的资产种类数量" placement="top">
                      <el-icon style="margin-left: 4px" :size="12">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </template>
              </el-statistic>
              <div class="statistic-footer">
                <div class="footer-item">
                  <span>资产种类</span>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.id"
                placeholder="ID (流水/策略/仓位/订单/信号)"
                style="width: 200px;"
                class="filter-item"
              />
              <el-select
                v-model="listQuery.transaction_type"
                placeholder="流水类型"
                clearable
                style="width: 150px;"
                class="filter-item"
              >
                <el-option label="冻结" value="FROZEN" />
                <el-option label="解冻" value="UNFROZEN" />
                <el-option label="充值" value="DEPOSIT" />
                <el-option label="提现" value="WITHDRAW" />
                <el-option label="交易" value="TRADE" />
                <el-option label="手续费" value="FEE" />
                <el-option label="盈亏" value="PNL" />
                <el-option label="资金费" value="FUNDING" />
                <el-option label="结算" value="SETTLE" />
                <el-option label="其他" value="OTHER" />
              </el-select>
              <el-switch
                v-model="listQuery.show_frozen"
                active-text="显示冻结"
                inactive-text=""
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
          align="center"
          border
          fit
          highlight-current-row
        >
          <el-table-column label="时间" align="center" fixed="left">
            <template #default="scope">
              <div class="time-column">
                <div class="time-main">{{ formatDate(scope.row.created_at) }}</div>
                <div class="time-sub">{{ formatTimeOnly(scope.row.created_at) }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="流水类型" align="center">
            <template #default="scope">
              <el-tag :type="getTransactionTypeTag(scope.row.transaction_type)">
                {{ getTransactionTypeText(scope.row.transaction_type) }}
              </el-tag>
            </template>
          </el-table-column>
         
          <el-table-column label="变动前余额" align="right">
            <template #default="scope">
              {{ scope.row.balance_before ? formatNumber(scope.row.balance_before, 4) : '-' }}
            </template>
          </el-table-column>
           <el-table-column label="金额" align="right">
            <template #default="scope">
              <span :class="getAmountClass(scope.row.amount, scope.row.transaction_type)">
                {{ scope.row.amount > 0 ? '+' : '' }}{{ formatNumber(scope.row.amount, 4) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="变动后余额" align="right">
            <template #default="scope">
              {{ scope.row.balance_after ? formatNumber(scope.row.balance_after, 4) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="描述" min-width="200">
            <template #default="scope">
              {{ scope.row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="100" fixed="right">
            <template #default="scope">
              <el-tooltip content="查看详情" placement="top">
                <el-button
                  size="small"
                  type="primary"
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
      title="流水详情"
      v-model="detailDialogVisible"
      width="900px"
    >
      <div class="detail-container">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h3 class="section-title">基本信息</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>流水ID:</label>
              <span>{{ detail.id }}</span>
            </div>
            <div class="detail-item">
              <label>流水类型:</label>
              <el-tag :type="getTransactionTypeTag(detail.transaction_type)">
                {{ getTransactionTypeText(detail.transaction_type) }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>资产:</label>
              <span>{{ detail.asset_key }}</span>
            </div>
            <div class="detail-item">
              <label>金额:</label>
              <span :class="getAmountClass(detail.amount, detail.transaction_type)">
                {{ scope.row.amount > 0 ? '+' : '' }} {{ formatNumber(detail.amount, 12) }}
              </span>
            </div>
            <div class="detail-item">
              <label>变动前余额:</label>
              <span>{{ detail.balance_before ? formatNumber(detail.balance_before, 12) : '-' }}</span>
            </div>
            <div class="detail-item">
              <label>变动后余额:</label>
              <span>{{ detail.balance_after ? formatNumber(detail.balance_after, 12) : '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 关联信息 -->
        <div class="detail-section" v-if="hasRelatedInfo">
          <h3 class="section-title">关联信息</h3>
          <div class="detail-grid">
            <div class="detail-item" v-if="detail.strategy_id">
              <label>策略ID:</label>
              <span>{{ detail.strategy_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.strategy_instance_id">
              <label>策略实例ID:</label>
              <span>{{ detail.strategy_instance_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.position_id">
              <label>仓位ID:</label>
              <span>{{ detail.position_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.order_id">
              <label>订单ID:</label>
              <span>{{ detail.order_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.signal_id">
              <label>信号ID:</label>
              <span>{{ detail.signal_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.executor_id">
              <label>执行器ID:</label>
              <span>{{ detail.executor_id }}</span>
            </div>
            <div class="detail-item" v-if="detail.project_id">
              <label>项目ID:</label>
              <span>{{ detail.project_id }}</span>
            </div>
          </div>
        </div>

        <!-- 描述信息 -->
        <div class="detail-section" v-if="detail.description">
          <h3 class="section-title">描述信息</h3>
          <div class="description-content">
            {{ detail.description }}
          </div>
        </div>

        <!-- 时间信息 -->
        <div class="detail-section">
          <h3 class="section-title">时间信息</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>创建时间:</label>
              <span>{{ formatDate(detail.created_at) }} {{ formatTimeOnly(detail.created_at) }}</span>
            </div>
            <div class="detail-item">
              <label>更新时间:</label>
              <span>{{ formatDate(detail.updated_at) }} {{ formatTimeOnly(detail.updated_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="text-end">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getTransactions, getTransaction } from '@/api/transaction'
import { getPositionStatus } from '@/api/dashboard'
import { resetPositionState as resetPositionStateApi } from '@/api/config'
import { View, InfoFilled, CaretTop, CaretBottom } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatNumber, filterEmptyParams } from '@/utils/format'

export default {
  name: 'Transaction',
  components: { View, Pagination, InfoFilled, CaretTop, CaretBottom },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        id: undefined,
        transaction_type: undefined,
        show_frozen: false
      },
      detailDialogVisible: false,
      detail: {},
      positionData: {
        total_amount: 0,
        activate_amount: 0,
        pnl: 0,
        friction: 0,
        fee: 0,
        virtual_pnl: 0,
        positions: [],
        asset_count: 0,
        position_count: 0,
        total_amount_change: 0,
        activate_amount_change: 0,
        pnl_change: 0,
        friction_change: 0,
        fee_change: 0,
        virtual_pnl_change: 0
      }, // 新增资产状态数据
      resettingPositionState: false, // 新增重置资产状态按钮加载状态
      timer: null // 定时器
    }
  },
  computed: {
    hasRelatedInfo() {
      return this.detail.strategy_id || 
             this.detail.strategy_instance_id || 
             this.detail.position_id || 
             this.detail.order_id || 
             this.detail.signal_id || 
             this.detail.executor_id || 
             this.detail.project_id
    }
  },
  created() {
    this.getList()
  },
  mounted() {
    // 先获取一次数据
    this.getPositionState()
    // 启动定时器，每15秒刷新一次
    this.timer = setInterval(() => {
      this.getPositionState()
    }, 15000)
  },
  beforeUnmount() {
    // 清理定时器
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },
  // 关键：keep-alive 场景下的激活/失活
  activated() {
    // 先获取一次数据
    this.getPositionState()
    // 如果定时器不存在，则启动定时器
    if (!this.timer) {
      this.timer = setInterval(() => {
        this.getPositionState()
      }, 15000)
    }
  },
  deactivated() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        // 过滤掉空字符串，避免后端解析错误
        const queryParams = filterEmptyParams(this.listQuery)
        
        const { data } = await getTransactions(queryParams)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        console.error('获取流水列表失败:', error)
        this.$message.error('获取流水列表失败')
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
        const { data } = await getTransaction(row.id)
        this.detail = data
        this.detailDialogVisible = true
      } catch (error) {
        console.error('获取流水详情失败:', error)
        this.$message.error('获取流水详情失败')
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    formatTimeOnly(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    formatNumber,
    getTransactionTypeText(type) {
      const typeMap = {
        0: '冻结',
        1: '解冻',
        2: '充值',
        3: '提现',
        4: '交易',
        5: '手续费',
        6: '盈亏',
        7: '资金费',
        8: '结算',
        9: '其他'
      }
      return typeMap[type] || type
    },
    getTransactionTypeTag(type) {
      const tagMap = {
        0: 'warning',
        1: 'success',
        2: 'success',
        3: 'danger',
        4: 'primary',
        5: 'warning',
        6: 'success',
        7: 'warning',
        8: 'info',
        9: 'info'
      }
      return tagMap[type] || 'info'
    },
    getAmountClass(amount, type) {
      const numAmount = parseFloat(amount) || 0
      if (type === 0 || type === 1) { // FROZEN || UNFROZEN
        return 'info'
      }
      if (type === 5) { // FEE
        return 'text-warning'
      }
      return numAmount > 0 ? 'text-success' : numAmount < 0 ? 'text-danger' : ''
    },
    async getPositionState() {
      try {
        const { data } = await getPositionStatus()
        if (data && data.current) {
          // 确保positionData不为null
          this.positionData = {
            ...data.current,
            // 添加变化率数据
            total_amount_change: data.change_rates?.total_amount_change || 0,
            activate_amount_change: data.change_rates?.activate_amount_change || 0,
            pnl_change: data.change_rates?.pnl_change || 0,
            friction_change: data.change_rates?.friction_change || 0,
            fee_change: data.change_rates?.fee_change || 0,
            virtual_pnl_change: data.change_rates?.virtual_pnl_change || 0
          }
        } else {
          // 如果数据为空或null，设置total_amount为0以隐藏卡片
          this.positionData = {
            total_amount: 0,
            activate_amount: 0,
            pnl: 0,
            friction: 0,
            fee: 0,
            virtual_pnl: 0,
            positions: [],
            asset_count: 0,
            position_count: 0,
            total_amount_change: 0,
            activate_amount_change: 0,
            pnl_change: 0,
            friction_change: 0,
            fee_change: 0,
            virtual_pnl_change: 0
          }
        }
      } catch (error) {
        console.error('获取资产状态失败:', error)
        // 设置total_amount为0以隐藏卡片
        this.positionData = {
          total_amount: 0,
          activate_amount: 0,
          pnl: 0,
          friction: 0,
          fee: 0,
          virtual_pnl: 0,
          positions: [],
          asset_count: 0,
          position_count: 0,
          total_amount_change: 0,
          activate_amount_change: 0,
          pnl_change: 0,
          friction_change: 0,
          fee_change: 0,
          virtual_pnl_change: 0
        }
      }
    },
    async resetPositionState() {
      try {
        await this.$confirm('确认重置资产状态? 该操作会清除所有策略的仓位信息，请谨慎操作!', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        this.resettingPositionState = true
        await resetPositionStateApi()
        this.$message.success('资产状态重置成功！')
        this.getPositionState() // 重新获取资产状态
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('重置资产状态失败')
        }
      } finally {
        this.resettingPositionState = false
      }
    },
    formatAmount(value) {
      if (value === null || value === undefined) return 'N/A'
      return formatNumber(value, 4)
    },
    formatChangeRate(rate) {
      if (rate === null || rate === undefined) return ''
      // 确保rate是数字类型
      const numRate = parseFloat(rate) || 0
      const sign = numRate > 0 ? '+' : ''
      return `${sign}${numRate.toFixed(2)}%`
    },
    getChangeRateClass(rate) {
      if (rate === null || rate === undefined) return ''
      // 确保rate是数字类型
      const numRate = parseFloat(rate) || 0
      return numRate > 0 ? 'text-success' : numRate < 0 ? 'text-danger' : ''
    },
    getPnlColor(pnl) {
      if (pnl === null || pnl === undefined) return ''
      const numPnl = parseFloat(pnl) || 0
      if (numPnl > 0) return '#67c23a'
      if (numPnl < 0) return '#f56c6c'
      return ''
    }
  }
}
</script>

<style lang="scss" scoped>
.transaction-page {
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
    align-items: center;
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
.text-warning {
  color: #e6a23c;
}
.el-table {
  font-size: 14px;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-0 {
  margin-top: 0;
}

/* 资产状态卡片样式 */
.card-title {
  font-size: 1.3rem;
  font-weight: 500;
}

.statistics-container {
  padding: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  
  .el-row {
    margin-bottom: 0 !important;
  }
  
  .el-row + .el-row {
    margin-top: 8px !important;
  }
}

.el-statistic {
  --el-statistic-content-font-size: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.statistic-card {
  height: 80px;
  padding: 16px;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background-color: #ffffff;
  }
}

.statistic-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 0;
  flex-shrink: 0;
}

.statistic-footer .footer-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.statistic-footer .footer-item span:last-child {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

/* 新增时间列样式 */
.time-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-main {
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

 .time-sub {
   font-size: 12px;
   color: var(--el-text-color-secondary);
 }

/* 详情对话框样式 */
.transaction-page .detail-container {
  padding: 0 !important;
}

.transaction-page .detail-section {
  margin-bottom: 24px !important;
  
  &:last-child {
    margin-bottom: 0 !important;
  }
}

.transaction-page .section-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: var(--el-text-color-primary) !important;
  margin: 0 0 16px 0 !important;
  padding-bottom: 8px !important;
  border-bottom: 2px solid var(--el-border-color-light) !important;
  text-align: left !important;
}

.transaction-page .detail-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
  gap: 16px !important;
  margin-bottom: 16px !important;
}

.transaction-page .detail-item {
  display: flex !important;
  align-items: center !important;
  padding: 8px 0 !important;
  border-bottom: 1px solid var(--el-border-color-lighter) !important;
  
  &:last-child {
    border-bottom: none !important;
  }
  
  label {
    font-weight: 500 !important;
    color: var(--el-text-color-regular) !important;
    min-width: 120px !important;
    margin-right: 12px !important;
    flex-shrink: 0 !important;
  }
  
  span {
    color: var(--el-text-color-primary) !important;
    word-break: break-all !important;
    flex: 1 !important;
  }
}

.transaction-page .description-content {
  background-color: var(--el-fill-color-light) !important;
  padding: 12px !important;
  border-radius: 4px !important;
  border-left: 4px solid var(--el-color-primary) !important;
  color: var(--el-text-color-primary) !important;
  line-height: 1.6 !important;
  margin: 0 !important;
}
</style> 