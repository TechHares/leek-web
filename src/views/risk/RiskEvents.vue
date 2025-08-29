<template>
  <div class="risk-events-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input v-model="query.keyword" placeholder="搜索事件/策略/标的" style="width: 240px;" class="filter-item" @keyup.enter="getList" />
              <el-date-picker v-model="query.range" type="datetimerange" range-separator="-" start-placeholder="开始" end-placeholder="结束" />
            </div>
            <div class="right-actions">
              <el-button @click="getList">查询</el-button>
            </div>
          </div>
        </div>
      </template>
      <el-table :data="list" border fit size="small">
        <el-table-column label="时间" width="180">
          <template #default="scope">{{ formatDate(scope.row.event_time) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="120" prop="type" />
        <el-table-column label="策略" prop="strategy_name" />
        <el-table-column label="实例ID" prop="strategy_instance_id" />
        <el-table-column label="标的" prop="symbol" width="140" />
        <el-table-column label="详情">
          <template #default="scope">
            <span style="white-space: pre-line">{{ scope.row.detail || '' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total>0" :total="total" v-model:page="query.page" v-model:limit="query.size" @pagination="getList" />
    </el-card>
  </div>
</template>

<script>
import Pagination from '@/components/Pagination/index.vue'

export default {
  name: 'RiskEvents',
  components: { Pagination },
  data() {
    return {
      query: { page: 1, size: 20, keyword: '', range: [] },
      list: [],
      total: 0,
      loading: false
    }
  },
  created() { this.getList() },
  methods: {
    async getList() {
      // TODO: 接入后端事件接口; 先占位
      this.loading = true
      try {
        this.list = []
        this.total = 0
      } finally { this.loading = false }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.risk-events-page { padding: 20px; }
.el-card { margin-bottom: 20px; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05); border-radius: 12px; }
.header-bar { .table-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; } .left-actions { display: flex; gap: 8px; } .right-actions { display: flex; justify-content: flex-end; flex: 1; } }
.filter-item { margin-right: 8px; }
</style>

