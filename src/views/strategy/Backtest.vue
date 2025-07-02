<template>
  <div class="backtest-page">
    <!-- 回测配置区域 -->
    <el-card v-if="!backtestId" shadow="hover" class="config-card">
      <template #header>
        <div class="card-header">
          <span>回测配置</span>
        </div>
      </template>
      
      <el-form
        ref="configForm"
        :model="configForm"
        :rules="configRules"
        label-width="120px"
        class="config-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="回测名称" prop="name">
              <el-input v-model="configForm.name" placeholder="请输入回测名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="策略" prop="strategy_id">
              <el-select
                v-model="configForm.strategy_id"
                placeholder="请选择策略"
                style="width: 100%"
                @change="handleStrategyChange"
              >
                <el-option
                  v-for="strategy in strategies"
                  :key="strategy.id"
                  :label="strategy.name"
                  :value="strategy.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数据源" prop="data_source_id">
              <el-select
                v-model="configForm.data_source_id"
                placeholder="请选择数据源"
                style="width: 100%"
              >
                <el-option
                  v-for="ds in dataSources"
                  :key="ds.id"
                  :label="ds.name"
                  :value="ds.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="交易标的" prop="symbol">
              <el-input v-model="configForm.symbol" placeholder="如: BTC-USDT" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="回测周期" prop="date_range">
              <el-date-picker
                v-model="configForm.date_range"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="初始资金" prop="initial_capital">
              <el-input-number
                v-model="configForm.initial_capital"
                :min="1000"
                :max="10000000"
                :step="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手续费率" prop="commission_rate">
              <el-input-number
                v-model="configForm.commission_rate"
                :min="0"
                :max="0.01"
                :step="0.0001"
                :precision="4"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="滑点" prop="slippage">
              <el-input-number
                v-model="configForm.slippage"
                :min="0"
                :max="0.01"
                :step="0.0001"
                :precision="4"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注">
          <el-input
            v-model="configForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="startBacktest" :loading="backtestLoading">
            开始回测
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 回测结果展示区域 -->
    <div v-if="backtestId || backtestResult" class="result-section">
      <!-- 回测概览 -->
      <el-card shadow="hover" class="overview-card">
        <template #header>
          <div class="card-header">
            <span>回测概览</span>
            <div class="header-actions">
              <el-button size="small" @click="refreshResult">刷新</el-button>
              <el-button size="small" @click="exportResult">导出</el-button>
            </div>
          </div>
        </template>
        
        <el-row :gutter="20" v-if="backtestResult">
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">总收益率</div>
              <div class="metric-value" :class="backtestResult.total_return >= 0 ? 'positive' : 'negative'">
                {{ formatPercent(backtestResult.total_return) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">年化收益率</div>
              <div class="metric-value" :class="backtestResult.annual_return >= 0 ? 'positive' : 'negative'">
                {{ formatPercent(backtestResult.annual_return) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">最大回撤</div>
              <div class="metric-value negative">
                {{ formatPercent(backtestResult.max_drawdown) }}
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">夏普比率</div>
              <div class="metric-value">
                {{ formatNumber(backtestResult.sharpe_ratio, 2) }}
              </div>
            </div>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="backtestResult" style="margin-top: 20px;">
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">总交易次数</div>
              <div class="metric-value">{{ backtestResult.total_trades }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">胜率</div>
              <div class="metric-value">{{ formatPercent(backtestResult.win_rate) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">盈亏比</div>
              <div class="metric-value">{{ formatNumber(backtestResult.profit_loss_ratio, 2) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric-card">
              <div class="metric-title">最终资金</div>
              <div class="metric-value">{{ formatNumber(backtestResult.final_capital, 2) }}</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 图表展示区域 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="16">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>收益曲线</span>
                <el-radio-group v-model="chartType" size="small">
                  <el-radio-button label="equity">资金曲线</el-radio-button>
                  <el-radio-button label="drawdown">回撤曲线</el-radio-button>
                  <el-radio-button label="returns">收益率</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div class="chart-container">
              <div ref="chartRef" style="width: 100%; height: 400px;"></div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>交易统计</span>
              </div>
            </template>
            <div class="trade-stats" v-if="backtestResult">
              <div class="stat-item">
                <span class="stat-label">盈利交易</span>
                <span class="stat-value">{{ backtestResult.winning_trades }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">亏损交易</span>
                <span class="stat-value">{{ backtestResult.losing_trades }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最大单笔盈利</span>
                <span class="stat-value positive">{{ formatNumber(backtestResult.max_profit, 2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最大单笔亏损</span>
                <span class="stat-value negative">{{ formatNumber(backtestResult.max_loss, 2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均盈利</span>
                <span class="stat-value positive">{{ formatNumber(backtestResult.avg_profit, 2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均亏损</span>
                <span class="stat-value negative">{{ formatNumber(backtestResult.avg_loss, 2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均持仓时间</span>
                <span class="stat-value">{{ backtestResult.avg_hold_time }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 交易记录表格 -->
      <el-card shadow="hover" style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>交易记录</span>
          </div>
        </template>
        
        <el-table
          :data="trades || []"
          style="width: 100%"
          size="small"
          border
          fit
          highlight-current-row
          v-loading="tradesLoading"
        >
          <el-table-column label="序号" align="center" width="60">
            <template #default="scope">
              {{ scope.$index + 1 }}
            </template>
          </el-table-column>
          <el-table-column label="开仓时间" align="center" width="160">
            <template #default="scope">
              {{ formatDateTime(scope.row.open_time) }}
            </template>
          </el-table-column>
          <el-table-column label="平仓时间" align="center" width="160">
            <template #default="scope">
              {{ formatDateTime(scope.row.close_time) }}
            </template>
          </el-table-column>
          <el-table-column label="方向" align="center" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.side === 'LONG' ? 'success' : 'danger'">
                {{ scope.row.side === 'LONG' ? '做多' : '做空' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开仓价格" align="right" width="120">
            <template #default="scope">
              {{ formatNumber(scope.row.open_price, 8) }}
            </template>
          </el-table-column>
          <el-table-column label="平仓价格" align="right" width="120">
            <template #default="scope">
              {{ formatNumber(scope.row.close_price, 8) }}
            </template>
          </el-table-column>
          <el-table-column label="数量" align="right" width="100">
            <template #default="scope">
              {{ formatNumber(scope.row.quantity, 4) }}
            </template>
          </el-table-column>
          <el-table-column label="盈亏" align="right" width="120">
            <template #default="scope">
              <span :class="scope.row.pnl >= 0 ? 'positive' : 'negative'">
                {{ scope.row.pnl >= 0 ? '+' : '' }}{{ formatNumber(scope.row.pnl, 2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="收益率" align="right" width="100">
            <template #default="scope">
              <span :class="scope.row.return_rate >= 0 ? 'positive' : 'negative'">
                {{ scope.row.return_rate >= 0 ? '+' : '' }}{{ formatPercent(scope.row.return_rate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="持仓时间" align="center" width="100">
            <template #default="scope">
              {{ scope.row.hold_time }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script>
import { createBacktest, getBacktestResult, getBacktestTrades, getStrategiesForBacktest, getDataSourcesForBacktest } from '@/api/backtest'
import * as echarts from 'echarts'

export default {
  name: 'Backtest',
  data() {
    return {
      backtestId: null,
      configForm: {
        name: '',
        strategy_id: null,
        data_source_id: null,
        symbol: '',
        date_range: null,
        initial_capital: 100000,
        commission_rate: 0.001,
        slippage: 0.0005,
        remark: ''
      },
      configRules: {
        name: [{ required: true, message: '请输入回测名称', trigger: 'blur' }],
        strategy_id: [{ required: true, message: '请选择策略', trigger: 'change' }],
        data_source_id: [{ required: true, message: '请选择数据源', trigger: 'change' }],
        symbol: [{ required: true, message: '请输入交易标的', trigger: 'blur' }],
        date_range: [{ required: true, message: '请选择回测周期', trigger: 'change' }],
        initial_capital: [{ required: true, message: '请输入初始资金', trigger: 'blur' }]
      },
      strategies: [],
      dataSources: [],
      backtestLoading: false,
      backtestResult: null,
      trades: [],
      tradesLoading: false,
      chartType: 'equity',
      chart: null
    }
  },
  async created() {
    // 检查是否是查看已有回测
    this.backtestId = this.$route.params.id
    if (this.backtestId) {
      await this.loadBacktestResult()
      await this.loadTrades()
    }
    
    await this.loadStrategies()
    await this.loadDataSources()
  },
  mounted() {
    if (this.backtestId) {
      this.$nextTick(() => {
        this.initChart()
      })
    }
  },
  methods: {
    async loadStrategies() {
      try {
        const { data } = await getStrategiesForBacktest()
        this.strategies = data.items || []
      } catch (error) {
        console.error('加载策略列表失败:', error)
      }
    },
    async loadDataSources() {
      try {
        const { data } = await getDataSourcesForBacktest()
        this.dataSources = data.items || []
      } catch (error) {
        console.error('加载数据源列表失败:', error)
      }
    },
    handleStrategyChange(strategyId) {
      const strategy = this.strategies.find(s => s.id === strategyId)
      if (strategy && !this.configForm.name) {
        this.configForm.name = `${strategy.name}_回测_${new Date().toLocaleDateString()}`
      }
    },
    async startBacktest() {
      try {
        await this.$refs.configForm.validate()
        
        this.backtestLoading = true
        
        const [startDate, endDate] = this.configForm.date_range
        const backtestData = {
          ...this.configForm,
          start_time: startDate,
          end_time: endDate
        }
        delete backtestData.date_range
        
        const { data } = await createBacktest(backtestData)
        this.backtestId = data.id
        
        this.$message.success('回测已开始，请稍后查看结果')
        
        // 轮询获取结果
        this.pollBacktestResult()
        
      } catch (error) {
        console.error('开始回测失败:', error)
        this.$message.error('开始回测失败')
      } finally {
        this.backtestLoading = false
      }
    },
    async pollBacktestResult() {
      const maxAttempts = 60 // 最多轮询60次
      let attempts = 0
      
      const poll = async () => {
        try {
          const { data } = await getBacktestResult(this.backtestId)
          if (data.status === 'completed') {
            this.backtestResult = data
            await this.loadTrades()
            this.$nextTick(() => {
              this.initChart()
            })
            this.$message.success('回测完成')
            return
          } else if (data.status === 'failed') {
            this.$message.error('回测失败')
            return
          }
          
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000) // 2秒后重试
          } else {
            this.$message.warning('回测超时，请稍后手动刷新')
          }
        } catch (error) {
          console.error('获取回测结果失败:', error)
        }
      }
      
      poll()
    },
    async loadBacktestResult() {
      try {
        const { data } = await getBacktestResult(this.backtestId)
        this.backtestResult = data
      } catch (error) {
        console.error('加载回测结果失败:', error)
        this.$message.error('加载回测结果失败')
      }
    },
    async loadTrades() {
      this.tradesLoading = true
      try {
        const { data } = await getBacktestTrades(this.backtestId)
        this.trades = data.items || []
      } catch (error) {
        console.error('加载交易记录失败:', error)
        this.$message.error('加载交易记录失败')
      } finally {
        this.tradesLoading = false
      }
    },
    refreshResult() {
      if (this.backtestId) {
        this.loadBacktestResult()
        this.loadTrades()
      }
    },
    exportResult() {
      // 导出功能实现
      this.$message.info('导出功能开发中')
    },
    resetForm() {
      this.$refs.configForm.resetFields()
    },
    initChart() {
      if (!this.backtestResult || !this.$refs.chartRef) return
      
      if (this.chart) {
        this.chart.dispose()
      }
      
      this.chart = echarts.init(this.$refs.chartRef)
      
      const option = this.getChartOption()
      this.chart.setOption(option)
    },
    getChartOption() {
      const data = this.backtestResult.equity_curve || []
      const dates = data.map(item => item.date)
      const values = data.map(item => item.value)
      
      return {
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const data = params[0]
            return `${data.name}<br/>${data.seriesName}: ${this.formatNumber(data.value, 2)}`
          }
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: (value) => {
              return new Date(value).toLocaleDateString()
            }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (value) => {
              return this.formatNumber(value, 2)
            }
          }
        },
        series: [{
          name: this.getChartSeriesName(),
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(64, 158, 255, 0.3)'
              }, {
                offset: 1, color: 'rgba(64, 158, 255, 0.1)'
              }]
            }
          }
        }]
      }
    },
    getChartSeriesName() {
      const nameMap = {
        equity: '资金曲线',
        drawdown: '回撤',
        returns: '收益率'
      }
      return nameMap[this.chartType] || '资金曲线'
    },
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null) return '-'
      return Number(num).toFixed(decimals).replace(/\.?0+$/, '')
    },
    formatPercent(value) {
      if (value === undefined || value === null) return '-'
      return (Number(value) * 100).toFixed(2) + '%'
    },
    formatDateTime(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  },
  watch: {
    chartType() {
      if (this.chart) {
        const option = this.getChartOption()
        this.chart.setOption(option)
      }
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.dispose()
    }
  }
}
</script>

<style lang="scss" scoped>
.backtest-page {
  padding: 20px;
}

.config-card {
  margin-bottom: 20px;
}

.config-form {
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.overview-card {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.metric-title {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #495057;
  
  &.positive {
    color: #28a745;
  }
  
  &.negative {
    color: #dc3545;
  }
}

.chart-container {
  padding: 20px 0;
}

.trade-stats {
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .stat-label {
    color: #6c757d;
    font-size: 14px;
  }
  
  .stat-value {
    font-weight: bold;
    color: #495057;
    
    &.positive {
      color: #28a745;
    }
    
    &.negative {
      color: #dc3545;
    }
  }
}

.el-card {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.positive {
  color: #28a745;
}

.negative {
  color: #dc3545;
}
</style> 