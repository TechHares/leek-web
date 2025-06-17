<template>
  <div class="strategy-signal-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-select
                v-model="listQuery.strategy_instance_id"
                placeholder="选择策略"
                clearable
                filterable
                style="width: 200px;"
                class="filter-item"
                @change="handleFilter"
              >
                <el-option
                  v-for="item in strategyOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-select
                v-model="listQuery.strategy_class_name"
                placeholder="选择策略模板"
                clearable
                filterable
                style="width: 200px;"
                class="filter-item"
                @change="handleFilter"
              >
                <el-option
                  v-for="item in strategyTemplates"
                  :key="item.cls"
                  :label="item.name"
                  :value="item.cls"
                />
              </el-select>
            </div>
            <div class="right-actions">
              <el-button
                type="primary"
                @click="handleFilter"
                class="filter-item"
              >
              <el-icon><Search /></el-icon>
                搜索
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
          border
          fit
          highlight-current-row
        >
          <el-table-column align="center" label="信号ID" width="160">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="策略">
            <template #default="scope">
              {{ scope.row.strategy_name }}
            </template>
          </el-table-column>
          <el-table-column label="资产信息" :min-width="240">
            <template #default="scope">
              <div v-if="Array.isArray(scope.row.assets) && scope.row.assets.length">
                <div v-for="(asset, idx) in scope.row.assets" :key="idx" style="margin-bottom: 2px;">
                  <!-- 1. 基本信息：资产类型、symbol、quote_currency、ins_type -->
                  <el-tag size="small" type="info" class="mr-1">
                    {{ assetTypeZh(asset.asset_type) }}|{{ asset.symbol }}_{{ asset.quote_currency }}|{{ insTypeZh(asset.ins_type) }}
                  </el-tag>
                  <!-- 2. side -->
                  <el-tag size="small" type="success" class="mr-2">
                    {{ sideZh(asset.side) }}, {{ asset.ratio }}
                  </el-tag>
                  <!-- 3. ratio, price -->
                  <el-tag size="small" type="warning" class="mr-1">
                     {{ asset.price }}
                  </el-tag>
                  <!-- 4. extra -->
                  <template v-if="asset.extra && Object.keys(asset.extra).length">
                    <el-tag
                      size="small"
                      type="info"
                      effect="plain"
                      class="mr-1"
                    >
                      {{ Object.entries(asset.extra).map(([k, v]) => `${k}: ${v}`).join(', ') }}
                    </el-tag>
                  </template>
                </div>
              </div>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="仓位配置">
            <template #default="scope">
              <template v-if="!scope.row.position_config">
                <span class="text-muted">--</span>
              </template>
              <template v-else>
                <el-tag
                  v-for="(value, key) in scope.row.position_config"
                  :key="key"
                  size="small"
                  type="info"
                  effect="plain"
                  class="mr-1"
                >
                  {{ key }}: {{ value }}
                </el-tag>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="扩展信息">
            <template #default="scope">
              <template v-if="!scope.row.extra || Object.keys(scope.row.extra).length === 0">
                <span class="text-muted">--</span>
              </template>
              <template v-else>
                <el-tag
                  v-for="(value, key) in scope.row.extra"
                  :key="key"
                  size="small"
                  type="info"
                  effect="plain"
                  class="mr-1"
                >
                  {{ key }}: {{ value }}
                </el-tag>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="信号时间">
            <template #default="scope">
              {{ formatDate(scope.row.signal_time) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="listQuery.page"
        v-model:limit="listQuery.size"
        @pagination="getList"
      />
    </el-card>
  </div>
</template>

<script>
import { getSignals } from '@/api/signal'
import { getStrategies } from '@/api/strategy'
import { getStrategyTemplates } from '@/api/strategy'
import Pagination from '@/components/Pagination/index.vue'
import { Search } from '@element-plus/icons-vue'
import { getAssetTypeTag, assetTypeZh, insTypeZh, sideZh, getPositionSideTag } from '@/utils/enum'

export default {
  name: 'StrategySignal',
  components: { Pagination, Search },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        strategy_instance_id: undefined,
        strategy_class_name: undefined
      },
      strategyOptions: [],
      strategyTemplates: []
    }
  },
  created() {
    this.getList()
    this.getStrategies()
    this.getStrategyTemplates()
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getSignals(this.listQuery)
        this.list = data
        this.total = data.length
      } catch (error) {
        console.error('获取信号列表失败:', error)
        this.$message.error('获取信号列表失败')
      }
      this.listLoading = false
    },
    async getStrategies() {
      try {
        const { data } = await getStrategies()
        this.strategyOptions = data
      } catch (error) {
        console.error('获取策略列表失败:', error)
        this.$message.error('获取策略列表失败')
      }
    },
    async getStrategyTemplates() {
      try {
        const { data } = await getStrategyTemplates()
        this.strategyTemplates = data
      } catch (error) {
        console.error('获取策略模板失败:', error)
        this.$message.error('获取策略模板失败')
      }
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    getAssetTypeTag,
    assetTypeZh,
    insTypeZh,
    sideZh,
    getPositionSideTag
  }
}
</script>

<style lang="scss" scoped>
.strategy-signal-page {
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
    align-items: center;
  }
  .right-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
  }
}
.filter-item {
  margin-right: 8px;
}
.text-center {
  text-align: center;
}
.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
.ml-2 {
  margin-left: 0.5rem;
}
.mr-1 {
  margin-right: 0.25rem;
}
.el-table {
  font-size: 14px;
}
</style> 