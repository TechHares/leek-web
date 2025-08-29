<template>
  <div class="risk-logs-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-select v-model="listQuery.risk_type" placeholder="风控类型" clearable style="width: 120px;" class="filter-item" @change="handleFilter">
                <el-option label="策略内嵌" value="embedded" />
                <el-option label="信号风控" value="signal" />
                <el-option label="主动风控" value="active" />
              </el-select>
              <el-input
                v-model="listQuery.strategy_instance_id"
                placeholder="策略实例ID"
                style="width: 150px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
              <el-date-picker
                v-model="dateRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 300px;"
                class="filter-item"
                @change="handleDateRangeChange"
              />
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="handleFilter" class="filter-item">
                <el-icon><Search /></el-icon> 查询
              </el-button>
              <el-button @click="resetFilter" class="filter-item">
                <el-icon><RefreshLeft /></el-icon> 重置
              </el-button>
            </div>
          </div>
        </div>
      </template>
      
      <div v-if="listLoading" class="text-center py-4">
        <el-skeleton :rows="6" animated />
      </div>
      <div v-else>
        <el-table :data="list || []" style="width: 100%;" size="small" border fit highlight-current-row>
          <el-table-column align="center" label="ID" width="80">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          
          <el-table-column label="风控类型" width="90" align="center">
            <template #default="scope">
              <el-tag :type="getRiskTypeTagType(scope.row.risk_type)" size="small">
                {{ getRiskTypeLabel(scope.row.risk_type) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="策略名称" min-width="100">
            <template #default="scope">
              <div v-if="scope.row.strategy_name">{{ scope.row.strategy_name }}</div>
              <div v-else-if="scope.row.strategy_instance_id">{{ scope.row.strategy_instance_id }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="风控名称" min-width="100">
            <template #default="scope">
              <div v-if="scope.row.risk_policy_name">{{ scope.row.risk_policy_name }}</div>
              <div v-else-if="scope.row.risk_policy_class_name">{{ scope.row.risk_policy_class_name }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="信号ID" min-width="120">
            <template #default="scope">
              <div v-if="scope.row.signal_id">{{ scope.row.signal_id }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="仓位ID" min-width="120">
            <template #default="scope">
              <div v-if="scope.row.position_id">{{ scope.row.position_id }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="金额" width="120" align="right">
            <template #default="scope">
              <div v-if="scope.row.original_amount">{{ formatAmount(scope.row.original_amount) }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="PNL" width="120" align="right">
            <template #default="scope">
              <div v-if="scope.row.pnl !== null && scope.row.pnl !== undefined" :class="scope.row.pnl < 0 ? 'text-success' : 'text-danger'">{{ formatAmount(scope.row.pnl) }}</div>
              <div v-else class="text-gray-400">--</div>
            </template>
          </el-table-column>
          
          <el-table-column label="触发时间" width="160">
            <template #default="scope">
              {{ formatDateTime(scope.row.trigger_time) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" align="center" width="100">
            <template #default="scope">
              <el-tooltip content="查看详情" placement="top">
                <el-button size="small" @click="handleViewDetail(scope.row)" circle>
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <pagination v-show="total > 0" :total="total" v-model:page="listQuery.page" v-model:limit="listQuery.size" @pagination="getList" />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog title="风控日志详情" v-model="detailDialogVisible" width="800px">
      <div v-if="selectedLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="风控类型">
            <el-tag :type="getRiskTypeTagType(selectedLog.risk_type)" size="small">
              {{ getRiskTypeLabel(selectedLog.risk_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="触发时间">{{ formatDateTime(selectedLog.trigger_time) }}</el-descriptions-item>
          <el-descriptions-item label="策略名称">{{ selectedLog.strategy_name || selectedLog.strategy_instance_id || '--' }}</el-descriptions-item>
          <el-descriptions-item label="风控名称">{{ selectedLog.risk_policy_name || selectedLog.risk_policy_class_name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="信号ID">{{ selectedLog.signal_id || '--' }}</el-descriptions-item>
          <el-descriptions-item label="仓位ID">{{ selectedLog.position_id || '--' }}</el-descriptions-item>
          <el-descriptions-item label="原始金额">{{ selectedLog.original_amount ? formatAmount(selectedLog.original_amount) : '--' }}</el-descriptions-item>
          <el-descriptions-item label="PNL"><span :class="selectedLog.pnl < 0 ? 'text-success' : 'text-danger'">{{ selectedLog.pnl !== null && selectedLog.pnl !== undefined ? formatAmount(selectedLog.pnl) : '--' }}</span></el-descriptions-item>
        </el-descriptions>
        
        <div style="margin-top: 16px;" v-if="selectedLog.trigger_reason">
          <h4>触发原因</h4>
          <el-alert :title="selectedLog.trigger_reason" type="warning" show-icon :closable="false" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Search, RefreshLeft, View 
} from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { getRiskLogs } from '@/api/risk'
import { formatDateTime } from '@/utils/format'

// 格式化金额
const formatAmount = (amount) => {
  if (amount === null || amount === undefined) return '--'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export default {
  name: 'RiskLogs',
  components: { Pagination },
  setup() {
    const list = ref(null)
    const total = ref(0)
    const listLoading = ref(true)
    const detailDialogVisible = ref(false)
    const selectedLog = ref(null)
    const dateRange = ref([])
    
    const listQuery = reactive({
      page: 1,
      size: 20,
      risk_type: '',
      strategy_instance_id: '',
      start_time: '',
      end_time: '',
      order_by: 'trigger_time',
      order_desc: true
    })
    
    // 方法
    const getList = async () => {
      listLoading.value = true
      try {
        const params = { ...listQuery }
        // 清除空值
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null || params[key] === undefined) {
            delete params[key]
          }
        })
        
        const { data } = await getRiskLogs(params)
        list.value = data.items
        total.value = data.total
      } catch (e) {
        ElMessage.error('获取风控日志失败')
      }
      listLoading.value = false
    }
    
    const handleFilter = () => {
      listQuery.page = 1
      getList()
    }
    
    const resetFilter = () => {
      Object.assign(listQuery, {
        page: 1,
        size: 20,
        risk_type: '',
        strategy_instance_id: '',
        start_time: '',
        end_time: '',
        order_by: 'trigger_time',
        order_desc: true
      })
      dateRange.value = []
      getList()
    }
    
    const handleDateRangeChange = (value) => {
      if (value && value.length === 2) {
        listQuery.start_time = value[0]
        listQuery.end_time = value[1]
      } else {
        listQuery.start_time = ''
        listQuery.end_time = ''
      }
    }
    
    const handleViewDetail = (row) => {
      selectedLog.value = row
      detailDialogVisible.value = true
    }
    
    const getRiskTypeLabel = (type) => {
      const labels = {
        embedded: '策略内嵌',
        signal: '信号风控',
        active: '主动风控'
      }
      return labels[type] || type
    }
    
    const getRiskTypeTagType = (type) => {
      const types = {
        embedded: 'info',
        signal: 'warning',
        active: 'danger'
      }
      return types[type] || 'info'
    }
    
    onMounted(() => {
      getList()
    })
    
    return {
      list,
      total,
      listLoading,
      listQuery,
      detailDialogVisible,
      selectedLog,
      dateRange,
      getList,
      handleFilter,
      resetFilter,
      handleDateRangeChange,
      handleViewDetail,
      getRiskTypeLabel,
      getRiskTypeTagType,
      formatDateTime,
      formatAmount
    }
  }
}
</script>

<style lang="scss" scoped>
.risk-logs-page {
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
  .right-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.filter-item {
  margin-right: 8px;
}

.text-xs {
  font-size: 12px;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.text-center {
  text-align: center;
}

.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.el-table {
  font-size: 14px;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
.text-success {
  color: #67c23a;
}
.text-danger {
  color: #f56c6c;
}
</style>