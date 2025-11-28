<template>
  <div class="factor-evaluation-page">
    <!-- 任务列表 -->
    <el-card shadow="hover" style="margin-bottom: 20px;">
      <template #header>
        <div class="header-bar">
          <h2>因子评价</h2>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon> 新建评价
          </el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.name"
          placeholder="搜索评价名称"
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
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="factor_count" label="因子数量" width="100" align="center" />
        <el-table-column prop="ic_mean" label="IC均值" width="110" align="right">
          <template #default="scope">
            {{ formatNumber(scope.row.ic_mean, 4) }}
          </template>
        </el-table-column>
        <el-table-column prop="ir" label="IR" width="110" align="right">
          <template #default="scope">
            {{ formatNumber(scope.row.ir, 4) }}
          </template>
        </el-table-column>
        <el-table-column prop="ic_win_rate" label="IC胜率" width="110" align="right">
          <template #default="scope">
            {{ formatPercent(scope.row.ic_win_rate) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button
                size="small"
                @click="viewDetails(scope.row)"
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

    <!-- 创建评价弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建因子评价"
      width="800px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入评价名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item label="数据配置" prop="data_config_id">
          <el-select
            v-model="form.data_config_id"
            placeholder="请选择数据配置"
            filterable
            @change="onDataConfigChange"
          >
            <el-option
              v-for="cfg in dataConfigs"
              :key="cfg.id"
              :label="cfg.name"
              :value="cfg.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="交易标的" prop="symbols">
          <el-select
            v-model="form.symbols"
            multiple
            filterable
            allow-create
            default-first-item
            placeholder="输入后回车添加"
          >
            <el-option
              v-for="s in form.symbols"
              :key="s"
              :label="s"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间周期" prop="timeframes">
          <el-select
            v-model="form.timeframes"
            multiple
            placeholder="请选择时间周期"
          >
            <el-option
              v-for="tf in timeframeOptions"
              :key="tf.value"
              :label="tf.label"
              :value="tf.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围" prop="date_range">
          <el-date-picker
            v-model="form.date_range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="评价因子" prop="factor_ids">
          <el-select
            v-model="form.factor_ids"
            multiple
            filterable
            placeholder="请选择要评价的因子"
            style="width: 100%;"
          >
            <el-option
              v-for="factor in factors"
              :key="factor.id"
              :label="factor.name"
              :value="factor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="未来收益期数">
          <el-input-number
            v-model="form.future_periods"
            :min="1"
            :max="20"
            controls-position="right"
          />
          <div class="form-tip">用于计算未来收益的期数</div>
        </el-form-item>
        <el-form-item label="分位数数量">
          <el-input-number
            v-model="form.quantile_count"
            :min="3"
            :max="10"
            controls-position="right"
          />
          <div class="form-tip">用于收益分析的分位数数量</div>
        </el-form-item>
        <el-form-item label="IC计算窗口">
          <el-input-number
            v-model="form.ic_window"
            :min="10"
            :max="1000"
            controls-position="right"
          />
          <div class="form-tip">IC计算窗口大小（留空表示使用所有历史数据累计计算，设置数值表示固定窗口大小）</div>
        </el-form-item>
        <el-form-item label="并发" prop="max_workers">
          <el-input-number
            v-model="form.max_workers"
            :min="1"
            :max="10000"
            controls-position="right"
          />
          <div class="form-tip">并行执行的最大工作进程数</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createTask" :loading="creating">确定</el-button>
      </template>
    </el-dialog>

    <!-- 结果查看弹窗 -->
    <el-dialog
      v-model="resultsDialogVisible"
      title="评价结果"
      width="1200px"
      @close="stopDetailPolling"
    >
      <div v-if="selectedTask">
        <!-- 运行中/排队中显示步骤式进度 -->
        <div v-if="selectedTask.status === 'running' || selectedTask.status === 'pending'" style="margin-bottom: 20px;">
          <el-card shadow="never">
            <!-- 调度任务 -->
            <div class="step-progress-header">
              <div class="step-item step-success">
                <div class="step-label">调度器初始化</div>
              </div>
            </div>
            
            <!-- 因子和任务步骤 -->
            <div v-if="taskStatus" class="step-progress-content">
              <div 
                v-for="(factor, factorId) in taskStatus.factors" 
                :key="factorId"
                class="factor-row"
              >
                <!-- 因子名称 -->
                <div class="factor-label">
                  {{ factor.factor_name || `因子${factorId}` }}
                </div>
                
                <!-- 任务步骤 -->
                <div class="factor-tasks">
                  <div 
                    v-for="(task, taskKey) in factor.tasks" 
                    :key="taskKey"
                    :class="['task-step', getTaskStepClass(task.status)]"
                    :title="`${task.symbol} ${task.timeframe}`"
                  >
                    {{ task.symbol }} {{ task.timeframe }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 数据合并 -->
            <div class="step-progress-footer">
              <div :class="['step-item', getPhaseStepClass(taskStatus?.data_merge_status)]">
                <div class="step-label">数据合并</div>
              </div>
            </div>
            <!-- 相关性计算 -->
            <div class="step-progress-footer">
              <div :class="['step-item', getPhaseStepClass(taskStatus?.correlation_status)]">
                <div class="step-label">相关性计算</div>
              </div>
            </div>
            <!-- 汇总指标计算 -->
            <div class="step-progress-footer">
              <div :class="['step-item', getPhaseStepClass(taskStatus?.summary_status)]">
                <div class="step-label">汇总指标计算</div>
              </div>
            </div>
            <!-- 数据落库 -->
            <div class="step-progress-footer">
              <div :class="['step-item', getPhaseStepClass(taskStatus?.data_storage_status)]">
                <div class="step-label">数据压缩入库</div>
              </div>
            </div>
            
            <!-- 总体进度 -->
            <div style="margin-top: 20px;">
              <el-progress
                :percentage="Math.round((selectedTask.progress || 0) * 100)"
                :status="selectedTask.status === 'failed' ? 'exception' : undefined"
                :stroke-width="20"
              />
              <div style="text-align: center; margin-top: 10px; color: #909399;">
                {{ selectedTask.status === 'running' ? '评价任务运行中，请稍候...' : '评价任务排队中，请稍候...' }}
              </div>
            </div>
          </el-card>
        </div>

        <!-- 失败状态显示错误信息 -->
        <div v-if="selectedTask.status === 'failed'" style="margin-bottom: 20px;">
          <el-alert
            type="error"
            :title="selectedTask.error || '评价任务失败'"
            show-icon
          />
        </div>

        <!-- 已完成状态显示结果 -->
        <div v-if="selectedTask.status === 'completed'">
        <!-- 汇总指标 -->
        <el-card shadow="never" style="margin-bottom: 20px;">
          <template #header>
            <h3>汇总指标</h3>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="metric-item" :class="getSummaryItemClass('ic_mean', selectedTask.summary?.ic_mean)">
                <div class="metric-label">IC均值</div>
                <div class="metric-value" :class="getSummaryValueClass('ic_mean', selectedTask.summary?.ic_mean)">
                  {{ formatNumber(selectedTask.summary?.ic_mean, 4) }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-item" :class="getSummaryItemClass('ir', selectedTask.summary?.ir)">
                <div class="metric-label">IR</div>
                <div class="metric-value" :class="getSummaryValueClass('ir', selectedTask.summary?.ir)">
                  {{ formatNumber(selectedTask.summary?.ir, 4) }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-item" :class="getSummaryItemClass('ic_win_rate', selectedTask.summary?.ic_win_rate)">
                <div class="metric-label">IC胜率</div>
                <div class="metric-value" :class="getSummaryValueClass('ic_win_rate', selectedTask.summary?.ic_win_rate)">
                  {{ formatPercent(selectedTask.summary?.ic_win_rate) }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-item">
                <div class="metric-label">因子数量</div>
                <div class="metric-value">{{ selectedTask.summary?.factor_count || 0 }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 图表区域 -->
        <el-card shadow="never" v-if="selectedTask.charts || selectedTask.metrics" style="margin-bottom: 20px;">
          <template #header>
            <h3>可视化图表</h3>
          </template>
          <el-tabs v-model="activeChartTab" @tab-change="handleTabChange">
            <el-tab-pane label="因子排名对比" name="ranking">
              <div ref="rankingChartRef" style="width: 100%; height: 500px;"></div>
            </el-tab-pane>
            <el-tab-pane label="分位数收益单调性" name="quantile">
              <div ref="quantileChartRef" style="width: 100%; height: 500px;"></div>
            </el-tab-pane>
            <el-tab-pane label="相关性热力图" name="correlation">
              <div ref="correlationChartRef" style="width: 100%; height: 500px;"></div>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <!-- 因子指标表格 -->
        <el-card shadow="never" style="margin-bottom: 20px;">
          <template #header>
            <h3>因子指标</h3>
          </template>
          <el-table
            :data="sortedMetrics"
            border
            stripe
            style="width: 100%;"
            :row-class-name="getRowClassName"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="factor_name" label="因子名称" min-width="200" />
            <el-table-column 
              prop="ic_mean" 
              label="IC均值" 
              width="120" 
              align="right"
              sortable="custom"
            >
              <template #default="scope">
                <span :class="getScoreClass('ic_mean', scope.row.ic_mean)">
                {{ formatNumber(scope.row.ic_mean, 4) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column 
              prop="ir" 
              label="IR" 
              width="120" 
              align="right"
              sortable="custom"
            >
              <template #default="scope">
                <span :class="getScoreClass('ir', scope.row.ir)">
                {{ formatNumber(scope.row.ir, 4) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column 
              prop="ic_win_rate" 
              label="IC胜率" 
              width="120" 
              align="right"
              sortable="custom"
            >
              <template #default="scope">
                <span :class="getScoreClass('ic_win_rate', scope.row.ic_win_rate)">
                {{ formatPercent(scope.row.ic_win_rate) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column 
              prop="ic_skewness" 
              label="IC偏度" 
              width="120" 
              align="right"
              sortable="custom"
            >
              <template #default="scope">
                <span :class="getScoreClass('ic_skewness', scope.row.ic_skewness)">
                {{ formatNumber(scope.row.ic_skewness, 4) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column 
              prop="long_short_return" 
              label="多空收益" 
              width="120" 
              align="right"
              sortable="custom"
            >
              <template #default="scope">
                <span :class="getScoreClass('long_short_return', scope.row.long_short_return)">
                  {{ formatPercent(scope.row.long_short_return) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="scope">
                <el-button
                  size="small"
                  type="primary"
                  @click="viewFactorDetails(scope.row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
      </div>
    </el-dialog>

    <!-- 单因子详情弹窗 -->
    <el-dialog
      v-model="factorDetailDialogVisible"
      :title="`因子详情 - ${selectedFactor?.factor_name || ''}`"
      width="1400px"
    >
      <FactorDetailCharts
        v-if="selectedFactor"
        :chart-data="factorChartData"
        :factor-id="selectedFactor.factor_id"
        @filter-change="handleFactorChartFilterChange"
      />
    </el-dialog>
  </div>
</template>

<script>
import { Plus, Search, RefreshRight } from '@element-plus/icons-vue'
import { 
  createFactorEvaluation, 
  getFactorEvaluationTasks, 
  getFactorEvaluationTask,
  deleteFactorEvaluationTask,
  getFactorCharts
} from '@/api/factor_evaluation'
import { getFactors } from '@/api/factor'
import { listBacktestConfigs } from '@/api/backtest'
import * as echarts from 'echarts'
import FactorDetailCharts from '@/components/factor_analysis/FactorDetailCharts.vue'

export default {
  name: 'FactorEvaluation',
  components: {
    Plus,
    Search,
    RefreshRight,
    FactorDetailCharts
  },
  data() {
    return {
      loading: false,
      creating: false,
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
      resultsDialogVisible: false,
      selectedTask: null,
      taskStatus: null,
      dataConfigs: [],
      factors: [],
      form: {
        name: '',
        remark: '',
        data_config_id: undefined,
        symbols: [],
        timeframes: [],
        date_range: null,
        factor_ids: [],
        future_periods: 1,
        quantile_count: 5,
        ic_window: null,
        max_workers: 1
      },
      rules: {
        name: [{ required: true, message: '请输入评价名称', trigger: 'blur' }],
        data_config_id: [{ required: true, message: '请选择数据配置', trigger: 'change' }],
        symbols: [{ type: 'array', required: true, message: '请填写交易标的', trigger: 'change' }],
        timeframes: [{ type: 'array', required: true, message: '请选择时间周期', trigger: 'change' }],
        date_range: [{ type: 'array', required: true, message: '请选择时间范围', trigger: 'change' }],
        factor_ids: [{ type: 'array', required: true, message: '请选择评价因子', trigger: 'change' }],
        max_workers: [{ required: true, type: 'number', message: '请输入并发数', trigger: 'blur' }]
      },
      timeframeOptions: [
        { value: '1m', label: '1分钟' },
        { value: '3m', label: '3分钟' },
        { value: '5m', label: '5分钟' },
        { value: '15m', label: '15分钟' },
        { value: '30m', label: '30分钟' },
        { value: '1H', label: '1小时' },
        { value: '4H', label: '4小时' },
        { value: '12H', label: '12小时' },
        { value: '1D', label: '1天' },
      ],
      pollTimer: null,
      detailPollTimer: null,
      rankingChart: null,
      quantileChart: null,
      correlationChart: null,
      sortConfig: {
        prop: null,
        order: null
      },
      activeChartTab: 'ranking',
      // 单因子详情相关
      factorDetailDialogVisible: false,
      selectedFactor: null,
      factorChartData: null
    }
  },
  computed: {
    sortedMetrics() {
      if (!this.selectedTask || !this.selectedTask.metrics) return []
      
      const metrics = [...this.selectedTask.metrics]
      const { prop, order } = this.sortConfig
      
      if (!prop || !order) return metrics
      
      return metrics.sort((a, b) => {
        let aVal = a[prop]
        let bVal = b[prop]
        
        if (aVal == null) aVal = 0
        if (bVal == null) bVal = 0
        
        if (order === 'ascending') {
          return aVal - bVal
        } else {
          return bVal - aVal
        }
      })
    }
  },
  computed: {
    sortedMetrics() {
      if (!this.selectedTask || !this.selectedTask.metrics) return []
      
      const metrics = [...this.selectedTask.metrics]
      const { prop, order } = this.sortConfig
      
      if (!prop || !order) return metrics
      
      return metrics.sort((a, b) => {
        let aVal = a[prop]
        let bVal = b[prop]
        
        // 处理null/undefined
        if (aVal == null) aVal = 0
        if (bVal == null) bVal = 0
        
        if (order === 'ascending') {
          return aVal - bVal
        } else {
          return bVal - aVal
        }
      })
    }
  },
  async created() {
    await this.loadData()
    await this.loadDataConfigs()
    await this.loadFactors()
  },
  beforeUnmount() {
    this.stopPolling()
    this.stopDetailPolling()
    this.destroyCharts()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          size: this.pagination.size,
          ...this.filters
        }
        const { data } = await getFactorEvaluationTasks(params)
        this.list = data.items || []
        this.total = data.total || 0
      } catch (e) {
        this.$message.error('获取评价列表失败')
      }
      this.loading = false
    },
    async loadDataConfigs() {
      try {
        const { data } = await listBacktestConfigs({ type: 'data', page: 1, size: 200 })
        this.dataConfigs = data.items || []
      } catch (e) {
        this.$message.error('获取数据配置失败')
      }
    },
    async loadFactors() {
      try {
        const { data } = await getFactors({ is_enabled: 1, page: 1, size: 1000 })
        this.factors = Array.isArray(data) ? data : []
      } catch (e) {
        console.error('获取因子列表失败:', e)
        this.$message.error('获取因子列表失败')
        this.factors = []
      }
    },
    onDataConfigChange(configId) {
      const config = this.dataConfigs.find(c => c.id === configId)
      if (config && config.extra) {
        const extra = typeof config.extra === 'string' ? JSON.parse(config.extra) : config.extra
        if (extra.symbols && extra.symbols.length > 0 && this.form.symbols.length === 0) {
          this.form.symbols = [...extra.symbols]
        }
        if (extra.timeframes && extra.timeframes.length > 0 && this.form.timeframes.length === 0) {
          this.form.timeframes = [...extra.timeframes]
        }
      }
    },
    resetFilters() {
      this.filters = {
        name: '',
        status: ''
      }
      this.loadData()
    },
    showCreateDialog() {
      this.form = {
        name: '',
        remark: '',
        data_config_id: undefined,
        symbols: [],
        timeframes: [],
        date_range: null,
        factor_ids: this.$route.query.factor_id ? [parseInt(this.$route.query.factor_id)] : [],
        future_periods: 1,
        quantile_count: 5,
        ic_window: null,
        max_workers: 1
      }
      this.createDialogVisible = true
    },
    async createTask() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        
        if (!this.form.date_range || this.form.date_range.length !== 2) {
          this.$message.error('请选择时间范围')
          return
        }
        
        this.creating = true
        try {
          const data = {
            name: this.form.name,
            remark: this.form.remark,
            data_config_id: this.form.data_config_id,
            symbols: this.form.symbols,
            timeframes: this.form.timeframes,
            start_time: this.form.date_range[0],
            end_time: this.form.date_range[1],
            factor_ids: this.form.factor_ids,
            future_periods: this.form.future_periods,
            quantile_count: this.form.quantile_count,
            ic_window: this.form.ic_window || null,
            max_workers: this.form.max_workers || 1
          }
          const { data: taskData } = await createFactorEvaluation(data)
          this.createDialogVisible = false
          this.loadData()
          
          // 创建成功后直接打开详情界面
          if (taskData && taskData.id) {
            // 使用创建返回的任务数据打开详情界面
            await this.viewDetails(taskData)
          }
        } catch (e) {
          this.$message.error('创建评价任务失败')
        }
        this.creating = false
      })
    },
    async viewDetails(row) {
      try {
        const { data } = await getFactorEvaluationTask(row.id, { expand_charts: true })
        this.selectedTask = data
        this.resultsDialogVisible = true
        
        // 重置排序配置
        this.sortConfig = { prop: null, order: null }
        
        // 提取任务状态信息
        if (data.config && data.config.task_status) {
          this.taskStatus = data.config.task_status
        } else {
          this.taskStatus = null
        }
        
        // 如果任务正在运行或排队中，启动详情页轮询
        if (data.status === 'running' || data.status === 'pending') {
          this.startDetailPolling(row.id)
        }
        
        this.$nextTick(() => {
          // 延迟一下确保DOM完全渲染
          setTimeout(() => {
            this.renderCharts()
          }, 100)
        })
      } catch (e) {
        this.$message.error('获取评价结果失败')
      }
    },
    async copyTask(row) {
      try {
        // 列表接口可能不包含 config 字段，需要获取详情
        let taskData = row
        if (!row.config) {
          const { data } = await getFactorEvaluationTask(row.id)
          taskData = data
        }
        
        // 从任务配置中复制信息
        const config = taskData.config || {}
        
        // 构建表单数据
        this.form = {
          name: `${row.name}_副本`,
          remark: config.remark || '',
          data_config_id: taskData.data_config_id,
          symbols: taskData.symbols ? [...taskData.symbols] : [],
          timeframes: taskData.timeframes ? [...taskData.timeframes] : [],
          date_range: taskData.start && taskData.end ? [taskData.start, taskData.end] : null,
          factor_ids: taskData.factor_ids ? [...taskData.factor_ids] : [],
          future_periods: config.future_periods !== undefined ? config.future_periods : 1,
          quantile_count: config.quantile_count !== undefined ? config.quantile_count : 5,
          ic_window: config.ic_window !== undefined ? config.ic_window : null,
          max_workers: config.max_workers !== undefined && config.max_workers !== null ? config.max_workers : 1
        }
        
        this.createDialogVisible = true
        this.$message.success('已复制任务配置，请修改后提交')
      } catch (e) {
        this.$message.error('获取任务详情失败，无法复制配置')
      }
    },
    async deleteTask(row) {
      try {
        await this.$confirm('确认删除该评价任务？', '提示', { type: 'warning' })
        await deleteFactorEvaluationTask(row.id)
        this.$message.success('删除成功')
        this.loadData()
      } catch (e) {
        if (e !== 'cancel') {
          // 显示更具体的错误信息
          const errorMsg = e?.response?.data?.detail || e?.message || '删除失败'
          if (e?.response?.status === 404) {
            this.$message.error('任务不存在或已被删除')
          } else {
            this.$message.error(errorMsg)
          }
        }
      }
    },
    renderCharts() {
      if (!this.selectedTask) return
      
      // 根据当前激活的tab渲染对应的图表
      if (this.activeChartTab === 'ranking') {
        this.renderRankingChart()
      } else if (this.activeChartTab === 'quantile') {
        this.renderQuantileChart()
      } else if (this.activeChartTab === 'correlation') {
        this.renderCorrelationChart()
      }
    },
    renderRankingChart() {
      if (this.$refs.rankingChartRef && this.selectedTask.metrics && this.selectedTask.metrics.length > 0) {
        try {
          const container = this.$refs.rankingChartRef
          if (!container) return
          
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(() => this.renderRankingChart(), 100)
            return
          }
          
          this.destroyChart('ranking')
          this.rankingChart = echarts.init(container)
          
          const metrics = this.selectedTask.metrics
          // 按IC均值排序，取前20个因子
          const sortedMetrics = [...metrics]
            .sort((a, b) => (b.ic_mean || 0) - (a.ic_mean || 0))
            .slice(0, 20)
          
          const factorNames = sortedMetrics.map(m => {
            // 截断过长的因子名称
            const name = m.factor_name || ''
            return name.length > 30 ? name.substring(0, 30) + '...' : name
          })
          
          const icMeans = sortedMetrics.map(m => m.ic_mean || 0)
          const irs = sortedMetrics.map(m => m.ir || 0)
          const icWinRates = sortedMetrics.map(m => (m.ic_win_rate || 0) * 100) // 转换为百分比
          const longShortReturns = sortedMetrics.map(m => (m.long_short_return || 0) * 100) // 转换为百分比
          
          this.rankingChart.setOption({
            title: { text: '因子排名对比（Top 20）', left: 'center' },
            tooltip: { 
              trigger: 'axis',
              axisPointer: { type: 'shadow' }
            },
            legend: { 
              data: ['IC均值', 'IR', 'IC胜率(%)', '多空收益(%)'],
              top: 30
            },
            grid: {
              left: '15%',
              right: '10%',
              bottom: '15%',
              top: '15%'
            },
            xAxis: {
              type: 'value',
              name: '数值'
            },
            yAxis: {
              type: 'category',
              data: factorNames,
              axisLabel: {
                interval: 0,
                fontSize: 10
              }
            },
            series: [
              {
                name: 'IC均值',
          type: 'bar',
                data: icMeans,
                itemStyle: { color: '#5470c6' }
              },
              {
                name: 'IR',
                type: 'bar',
                data: irs,
                itemStyle: { color: '#91cc75' }
              },
              {
                name: 'IC胜率(%)',
                type: 'bar',
                data: icWinRates,
                itemStyle: { color: '#fac858' }
              },
              {
                name: '多空收益(%)',
                type: 'bar',
                data: longShortReturns,
                itemStyle: { color: '#ee6666' }
              }
            ]
          })
        } catch (e) {
          console.error('渲染因子排名对比图失败:', e)
        }
      }
    },
    destroyChart(type) {
      if (type === 'ranking' && this.rankingChart) {
        this.rankingChart.dispose()
        this.rankingChart = null
      } else if (type === 'quantile' && this.quantileChart) {
        this.quantileChart.dispose()
        this.quantileChart = null
      } else if (type === 'correlation' && this.correlationChart) {
        this.correlationChart.dispose()
        this.correlationChart = null
      }
    },
    destroyCharts() {
      this.destroyChart('ranking')
      this.destroyChart('quantile')
      this.destroyChart('correlation')
    },
    handleSortChange({ prop, order }) {
      this.sortConfig = { prop, order }
    },
    getScoreClass(metricType, value) {
      if (value == null || isNaN(value)) return ''
      
      // 定义评分阈值（可根据实际情况调整）
      const thresholds = {
        ic_mean: { excellent: 0.1, good: 0.05, pass: 0.02 },
        ir: { excellent: 1.0, good: 0.5, pass: 0.2 },
        ic_win_rate: { excellent: 0.7, good: 0.6, pass: 0.5 },
        ic_skewness: { excellent: 0.1, good: 0.05, pass: -0.1 }, // 偏度接近0更好
        long_short_return: { excellent: 0.001, good: 0.0005, pass: 0.0001 }
      }
      
      const threshold = thresholds[metricType]
      if (!threshold) return ''
      
      let score = 'fail'
      if (metricType === 'ic_skewness') {
        // IC偏度：绝对值越小越好
        const absValue = Math.abs(value)
        if (absValue <= threshold.excellent) score = 'excellent'
        else if (absValue <= threshold.good) score = 'good'
        else if (absValue <= Math.abs(threshold.pass)) score = 'pass'
      } else {
        // 其他指标：值越大越好
        if (value >= threshold.excellent) score = 'excellent'
        else if (value >= threshold.good) score = 'good'
        else if (value >= threshold.pass) score = 'pass'
      }
      
      return `score-${score}`
    },
    getRowClassName({ row, rowIndex }) {
      // 根据IC均值设置行背景色
      const icMean = row.ic_mean || 0
      if (icMean >= 0.1) return 'row-excellent'
      if (icMean >= 0.05) return 'row-good'
      if (icMean >= 0.02) return 'row-pass'
      return 'row-fail'
    },
    getSummaryItemClass(metricType, value) {
      if (value == null || isNaN(value)) return ''
      
      const score = this.getSummaryScore(metricType, value)
      return `summary-item-${score}`
    },
    getSummaryValueClass(metricType, value) {
      if (value == null || isNaN(value)) return ''
      
      const score = this.getSummaryScore(metricType, value)
      return `summary-value-${score}`
    },
    getSummaryScore(metricType, value) {
      // 定义评分阈值（与表格中的阈值一致）
      const thresholds = {
        ic_mean: { excellent: 0.1, good: 0.05, pass: 0.02 },
        ir: { excellent: 1.0, good: 0.5, pass: 0.2 },
        ic_win_rate: { excellent: 0.7, good: 0.6, pass: 0.5 }
      }
      
      const threshold = thresholds[metricType]
      if (!threshold) return 'normal'
      
      if (value >= threshold.excellent) return 'excellent'
      if (value >= threshold.good) return 'good'
      if (value >= threshold.pass) return 'pass'
      return 'fail'
    },
    handleTabChange(tabName) {
      // Tab切换时延迟渲染，确保DOM完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          // 根据当前激活的tab渲染对应的图表
          if (tabName === 'correlation') {
            this.renderCorrelationChart()
          } else if (tabName === 'quantile') {
            this.renderQuantileChart()
          } else if (tabName === 'ranking') {
            this.renderRankingChart()
          }
        }, 150)
      })
    },
    renderRankingChart() {
      if (this.$refs.rankingChartRef && this.selectedTask.metrics && this.selectedTask.metrics.length > 0) {
        try {
          const container = this.$refs.rankingChartRef
          if (!container) return
          
          // 检查容器尺寸
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(() => this.renderRankingChart(), 100)
            return
          }
          
          this.destroyChart('ranking')
          this.rankingChart = echarts.init(container)
          
          const metrics = this.selectedTask.metrics
          const sortedMetrics = [...metrics]
            .sort((a, b) => (b.ic_mean || 0) - (a.ic_mean || 0))
            .slice(0, 20)
          
          const factorNames = sortedMetrics.map(m => {
            const name = m.factor_name || ''
            return name.length > 30 ? name.substring(0, 30) + '...' : name
          })
          
          const icMeans = sortedMetrics.map(m => m.ic_mean || 0)
          const irs = sortedMetrics.map(m => m.ir || 0)
          const icWinRates = sortedMetrics.map(m => (m.ic_win_rate || 0) * 100)
          const longShortReturns = sortedMetrics.map(m => (m.long_short_return || 0) * 100)
          
          this.rankingChart.setOption({
            title: { text: '因子排名对比（Top 20）', left: 'center' },
            tooltip: { 
              trigger: 'axis',
              axisPointer: { type: 'shadow' }
            },
            legend: { 
              data: ['IC均值', 'IR', 'IC胜率(%)', '多空收益(%)'],
              top: 30
            },
            grid: {
              left: '15%',
              right: '10%',
              bottom: '15%',
              top: '15%'
            },
            xAxis: {
              type: 'value',
              name: '数值'
            },
            yAxis: {
              type: 'category',
              data: factorNames,
              axisLabel: {
                interval: 0,
                fontSize: 10
              }
            },
            series: [
              {
                name: 'IC均值',
                type: 'bar',
                data: icMeans,
                itemStyle: { color: '#5470c6' }
              },
              {
                name: 'IR',
                type: 'bar',
                data: irs,
                itemStyle: { color: '#91cc75' }
              },
              {
                name: 'IC胜率(%)',
                type: 'bar',
                data: icWinRates,
                itemStyle: { color: '#fac858' }
              },
              {
                name: '多空收益(%)',
                type: 'bar',
                data: longShortReturns,
                itemStyle: { color: '#ee6666' }
              }
            ]
          })
        } catch (e) {
          console.error('渲染因子排名对比图失败:', e)
        }
      }
    },
    renderQuantileChart() {
      if (this.$refs.quantileChartRef && this.selectedTask.charts && this.selectedTask.charts.quantile_returns) {
        try {
          const container = this.$refs.quantileChartRef
          if (!container) return
          
          // 检查容器尺寸
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(() => this.renderQuantileChart(), 100)
            return
          }
          
          this.destroyChart('quantile')
          this.quantileChart = echarts.init(container)
          
          const quantileReturns = this.selectedTask.charts.quantile_returns
          const metrics = this.selectedTask.metrics || []
          
          const topFactors = [...metrics]
            .sort((a, b) => (b.ic_mean || 0) - (a.ic_mean || 0))
            .slice(0, 15)
          
          const series = topFactors
            .filter(m => {
              const factorName = m.factor_name
              return quantileReturns[factorName] && typeof quantileReturns[factorName] === 'object'
            })
            .map((m) => {
              const factorName = m.factor_name
              const quantileData = quantileReturns[factorName]
              
              const quantileKeys = Object.keys(quantileData).sort()
              const values = quantileKeys.map(key => (quantileData[key] || 0) * 100)
              
              return {
                name: factorName.length > 30 ? factorName.substring(0, 30) + '...' : factorName,
                type: 'line',
                data: values,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6
              }
            })
          
          if (series.length > 0) {
            const firstData = quantileReturns[topFactors[0].factor_name]
            const quantileKeys = Object.keys(firstData).sort()
            
            this.quantileChart.setOption({
              title: { text: '分位数收益单调性（Top 15）', left: 'center' },
              tooltip: { 
                trigger: 'axis',
                formatter: function(params) {
                  let result = params[0].name + '<br/>'
                  params.forEach(param => {
                    result += param.seriesName + ': ' + param.value.toFixed(4) + '%<br/>'
                  })
                  return result
                }
              },
              legend: {
                data: series.map(s => s.name),
                type: 'scroll',
                orient: 'vertical',
                right: 5,
                top: 50,
                textStyle: { fontSize: 9 },
                itemWidth: 12,
                itemHeight: 8,
                itemGap: 4
              },
              grid: {
                left: '8%',
                right: '20%',
                bottom: '10%',
                top: '15%'
              },
              xAxis: {
                type: 'category',
                data: quantileKeys,
                name: '分位数',
                nameLocation: 'middle',
                nameGap: 30
              },
              yAxis: {
                type: 'value',
                name: '收益(%)',
                nameLocation: 'middle',
                nameGap: 50
              },
              series
            })
          }
        } catch (e) {
          console.error('渲染分位数收益单调性图失败:', e)
        }
      }
    },
    renderCorrelationChart() {
      if (this.$refs.correlationChartRef && this.selectedTask.charts && this.selectedTask.charts.correlation_matrix) {
        try {
          const container = this.$refs.correlationChartRef
          if (!container) return
          
          // 检查容器尺寸
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            setTimeout(() => this.renderCorrelationChart(), 100)
            return
          }
          
          this.destroyChart('correlation')
          this.correlationChart = echarts.init(container)
          const matrix = this.selectedTask.charts.correlation_matrix
          
          if (matrix && typeof matrix === 'object') {
            const factors = Object.keys(matrix)
            
            if (factors.length === 0) {
              return
            }
            
            const displayFactors = factors.slice(0, 30)
            const data = []
            let minValue = Infinity
            let maxValue = -Infinity
            
            for (let i = 0; i < displayFactors.length; i++) {
              const f1 = displayFactors[i]
              for (let j = 0; j < displayFactors.length; j++) {
                const f2 = displayFactors[j]
                let value = 0
                
                if (matrix[f1] && typeof matrix[f1] === 'object') {
                  value = matrix[f1][f2] || 0
                } else if (matrix[f2] && typeof matrix[f2] === 'object') {
                  value = matrix[f2][f1] || 0
                }
                
                value = Number(value) || 0
                
                if (i === j) {
                  value = 1
                }
                
                data.push([i, j, value])
                
                if (value < minValue) minValue = value
                if (value > maxValue) maxValue = value
              }
            }
            
            if (minValue === Infinity || maxValue === -Infinity) {
              minValue = -1
              maxValue = 1
            }
            
            const option = {
              title: { 
                text: '因子相关性热力图（Top 30）', 
                left: 'center',
                top: 10
              },
              tooltip: { 
                position: 'top',
                formatter: function(params) {
                  if (params.data && Array.isArray(params.data) && params.data.length >= 3) {
                    const xIdx = params.data[0]
                    const yIdx = params.data[1]
                    const value = params.data[2]
                    return `${displayFactors[xIdx]}<br/>${displayFactors[yIdx]}<br/>相关性: ${value.toFixed(4)}`
                  }
                  return ''
                }
              },
              grid: {
                left: '18%',
                right: '3%',
                bottom: '25%',
                top: '15%',
                containLabel: false,
                show: true
              },
              xAxis: { 
                type: 'category', 
                data: displayFactors.map(f => f.length > 25 ? f.substring(0, 25) + '...' : f),
                splitArea: { show: true },
                axisLabel: { 
                  interval: 0,
                  rotate: 45,
                  fontSize: 9,
                  margin: 12
                },
                boundaryGap: true
              },
              yAxis: { 
                type: 'category', 
                data: displayFactors.map(f => f.length > 25 ? f.substring(0, 25) + '...' : f),
                splitArea: { show: true },
                axisLabel: { 
                  fontSize: 9,
                  margin: 12,
                  width: 120,
                  overflow: 'truncate'
                },
                boundaryGap: true
              },
              visualMap: {
                min: Math.min(-1, minValue),
                max: Math.max(1, maxValue),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '10%',
                itemWidth: 25,
                itemHeight: 12,
                inRange: {
                  color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
                },
                text: ['高', '低'],
                textStyle: {
                  fontSize: 10
                }
              },
              series: [{
                name: '相关性',
                type: 'heatmap',
                data: data,
                xAxisIndex: 0,
                yAxisIndex: 0,
                label: { 
                  show: false
                },
                itemStyle: {
                  borderColor: '#fff',
                  borderWidth: 1
                },
                emphasis: { 
                  itemStyle: { 
                    shadowBlur: 10, 
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                    borderWidth: 2
                  },
                  label: {
                    show: true,
                    fontSize: 10,
                    color: '#000'
                  }
                }
              }]
            }
            
            this.correlationChart.setOption(option, true)
          }
        } catch (e) {
          console.error('渲染相关性热力图失败:', e)
        }
      }
    },
    startPolling() {
      this.pollTimer = setInterval(() => {
        const runningTasks = this.list.filter(t => t.status === 'running' || t.status === 'pending')
        if (runningTasks.length > 0) {
          this.loadData()
        }
      }, 8000)
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    startDetailPolling(taskId) {
      // 停止之前的轮询
      this.stopDetailPolling()
      
      this.detailPollTimer = setInterval(async () => {
        try {
          const { data } = await getFactorEvaluationTask(taskId, { expand_charts: true })
          this.selectedTask = data
          
          // 提取任务状态信息
          if (data.config && data.config.task_status) {
            this.taskStatus = data.config.task_status
          } else {
            this.taskStatus = null
          }
          
          // 如果任务已完成或失败，停止轮询
          if (data.status === 'completed' || data.status === 'failed') {
            this.stopDetailPolling()
            // 如果已完成，重新渲染图表
            if (data.status === 'completed') {
              this.$nextTick(() => {
                this.renderCharts()
              })
            }
          }
        } catch (e) {
          console.error('轮询任务进度失败', e)
        }
      }, 3000) // 详情页轮询间隔3秒
    },
    stopDetailPolling() {
      if (this.detailPollTimer) {
        clearInterval(this.detailPollTimer)
        this.detailPollTimer = null
      }
    },
    getStatusTagType(status) {
      const map = {
        'pending': 'info',
        'running': 'warning',
        'completed': 'success',
        'failed': 'danger'
      }
      return map[status] || 'info'
    },
    getStatusText(status) {
      const map = {
        'pending': '排队中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败'
      }
      return map[status] || status
    },
    formatNumber(val, decimals = 2) {
      if (val === null || val === undefined || isNaN(val)) return '-'
      return Number(val).toFixed(decimals)
    },
    formatPercent(val) {
      if (val === null || val === undefined || isNaN(val)) return '-'
      return (Number(val) * 100).toFixed(2) + '%'
    },
    formatDateTime(val) {
      if (!val) return '-'
      const d = new Date(val)
      return d.toLocaleString('zh-CN')
    },
    getTrendClass(val) {
      if (val === null || val === undefined) return ''
      return Number(val) >= 0 ? 'text-success' : 'text-danger'
    },
    getTaskStepClass(status) {
      const statusMap = {
        'completed': 'step-success',
        'running': 'step-running',
        'NoResult': 'step-warning',
        'pending': 'step-pending',
        'failed': 'step-failed'
      }
      return statusMap[status] || 'step-pending'
    },
    getPhaseStepClass(status) {
      const statusMap = {
        'completed': 'step-success',
        'running': 'step-running',
        'pending': 'step-pending'
      }
      return statusMap[status] || 'step-pending'
    },
    async viewFactorDetails(row) {
      if (!this.selectedTask || !this.selectedTask.id) {
        this.$message.error('请先打开任务详情')
        return
      }
      
      this.selectedFactor = row
      this.factorDetailDialogVisible = true
      // 默认加载合并数据
      await this.loadFactorCharts({ merged: true })
    },
    async loadFactorCharts(filterParams = {}) {
      if (!this.selectedFactor || !this.selectedTask) return
      
      try {
        const params = {}
        // symbol 和 timeframe 现在是数组格式
        if (filterParams.symbol && Array.isArray(filterParams.symbol) && filterParams.symbol.length > 0) {
          params.symbol = filterParams.symbol
        }
        if (filterParams.timeframe && Array.isArray(filterParams.timeframe) && filterParams.timeframe.length > 0) {
          params.timeframe = filterParams.timeframe
        }
        if (filterParams.merged) {
          params.merged = true
        }
        
        const { data } = await getFactorCharts(
          this.selectedTask.id,
          this.selectedFactor.factor_id,
          params
        )
        
        this.factorChartData = data
      } catch (e) {
        this.$message.error('获取因子图表数据失败')
        console.error(e)
      }
    },
    handleFactorChartFilterChange(filterParams) {
      this.loadFactorCharts(filterParams)
    }
  }
}
</script>

<style scoped>
.factor-evaluation-page {
  padding: 20px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.metric-item {
  text-align: center;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.step-progress-header,
.step-progress-footer {
  margin-bottom: 20px;
}

.step-item {
  padding: 12px 20px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
}

.step-success {
  background-color: #67c23a;
  color: #fff;
}

.step-pending {
  background-color: #e4e7ed;
  color: #909399;
}

.step-running {
  background-color: #409eff;
  color: #fff;
}

.step-warning {
  background-color: #e6a23c;
  color: #fff;
}

.step-failed {
  background-color: #f56c6c;
  color: #fff;
}

.step-progress-content {
  margin: 20px 0;
}

.factor-row {
  display: flex;
  margin-bottom: 15px;
  align-items: flex-start;
}

.factor-label {
  min-width: 120px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-weight: 500;
  color: #303133;
  margin-right: 15px;
  text-align: center;
}

.factor-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.task-step {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  cursor: default;
}

.task-step.step-success {
  background-color: #67c23a;
  color: #fff;
}

.task-step.step-pending {
  background-color: #e4e7ed;
  color: #909399;
}

.task-step.step-running {
  background-color: #409eff;
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.task-step.step-failed {
  background-color: #f56c6c;
  color: #fff;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 表格行背景色分级 */
:deep(.row-excellent) {
  background-color: #e8f5e9 !important;
}

:deep(.row-excellent:hover) {
  background-color: #c8e6c9 !important;
}

:deep(.row-good) {
  background-color: #fff3e0 !important;
}

:deep(.row-good:hover) {
  background-color: #ffe0b2 !important;
}

:deep(.row-pass) {
  background-color: #e3f2fd !important;
}

:deep(.row-pass:hover) {
  background-color: #bbdefb !important;
}

:deep(.row-fail) {
  background-color: #fce4ec !important;
}

:deep(.row-fail:hover) {
  background-color: #f8bbd0 !important;
}

/* 单元格数值颜色分级 */
.score-excellent {
  color: #2e7d32;
  font-weight: 600;
}

.score-good {
  color: #f57c00;
  font-weight: 500;
}

.score-pass {
  color: #1976d2;
  font-weight: 500;
}

.score-fail {
  color: #c2185b;
}

/* 汇总指标背景色分级 */
.summary-item-excellent {
  background-color: #e8f5e9;
  border-radius: 8px;
  padding: 10px;
  border: 2px solid #4caf50;
}

.summary-item-good {
  background-color: #fff3e0;
  border-radius: 8px;
  padding: 10px;
  border: 2px solid #ff9800;
}

.summary-item-pass {
  background-color: #e3f2fd;
  border-radius: 8px;
  padding: 10px;
  border: 2px solid #2196f3;
}

.summary-item-fail {
  background-color: #fce4ec;
  border-radius: 8px;
  padding: 10px;
  border: 2px solid #e91e63;
}

/* 汇总指标数值颜色 */
.summary-value-excellent {
  color: #2e7d32;
  font-weight: 700;
  font-size: 26px;
}

.summary-value-good {
  color: #f57c00;
  font-weight: 700;
  font-size: 26px;
}

.summary-value-pass {
  color: #1976d2;
  font-weight: 700;
  font-size: 26px;
}

.summary-value-fail {
  color: #c2185b;
  font-weight: 700;
  font-size: 26px;
}
</style>
