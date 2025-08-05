<template>
  <div class="dashboard-performance">
    <div class="header">
      <div class="controls">
        <!-- 时间选择器 -->
        <div class="time-controls">
          <el-radio-group v-model="timeRange" @change="handleTimeRangeChange" size="small">
            <el-radio-button value="custom">自定义</el-radio-button>
            <el-radio-button value="3months">最近三个月</el-radio-button>
            <el-radio-button value="1month">最近一个月</el-radio-button>
            <el-radio-button value="1week">最近一周</el-radio-button>
          </el-radio-group>
          
          <div v-if="timeRange === 'custom'" class="custom-time">
            <el-date-picker
              v-model="customTimeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              size="small"
              @change="handleCustomTimeChange"
            />
          </div>
        </div>
        
        <!-- 功能按钮 -->
        <div class="action-controls">
          <el-button @click="refreshData" :loading="loading" size="small" type="primary">
            刷新数据
          </el-button>
          <el-button @click="clearCache" size="small">
            清除缓存
          </el-button>
        </div>
      </div>
    </div>
    
    <div class="content">


      <!-- 图表区域 -->
      <el-row :gutter="16">
        <!-- 累计盈利曲线图 -->
        <el-col :span="24" class="chart-card main-chart">
          <div v-if="Object.keys(strategiesData).length === 0" class="no-data">
            <el-empty description="暂无策略数据" />
          </div>
          <div v-else class="chart-wrapper">
            <div ref="equityChartRef" class="chart1"></div>
          </div>
        </el-col>
      </el-row>

      <!-- 策略性能表格 -->
      <el-row :gutter="16">
        <el-col :span="24">
          <div class="table-card">
            <div class="table-header">
              <h3>策略性能统计</h3>
            </div>
            <div v-if="Object.keys(strategiesData).length === 0" class="no-data">
              <el-empty description="暂无策略数据" />
            </div>
            <div v-else class="table-content">
                            <el-table
                :data="strategiesTableData"
                style="width: 100%"
                :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                stripe
                size="small"
                :default-sort="{ prop: 'total_pnl', order: 'descending' }"
              >
                <el-table-column prop="strategy_name" label="策略名称" min-width="100" sortable />
                <el-table-column prop="total_pnl" label="累计盈利" min-width="120" sortable>
                  <template #default="scope">
                    <span :style="{ color: scope.row.total_pnl >= 0 ? '#67c23a' : '#f56c6c' }">
                      {{ formatNumber(scope.row.total_pnl, 4) }} USDT
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="win_rate" label="胜率" min-width="80" sortable>
                  <template #default="scope">
                    <span style="color: #67c23a">
                      {{ formatPercentage(scope.row.win_rate) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="profit_loss_ratio" label="盈亏比" min-width="80" sortable>
                  <template #default="scope">
                    <span style="color: #409EFF">
                      {{ formatNumber(scope.row.profit_loss_ratio, 2) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="avg_holding_time" label="持仓时间" min-width="100" sortable>
                  <template #default="scope">
                    {{ formatNumber(scope.row.avg_holding_time, 1) }} 小时
                  </template>
                </el-table-column>
                <el-table-column prop="total_trades" label="总次数" min-width="70" sortable>
                  <template #default="scope">
                    {{ scope.row.total_trades }}
                  </template>
                </el-table-column>
                <el-table-column prop="winning_trades" label="盈利次数" min-width="80" sortable>
                  <template #default="scope">
                    <span style="color: #67c23a">{{ scope.row.winning_trades }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="losing_trades" label="亏损次数" min-width="80" sortable>
                  <template #default="scope">
                    <span style="color: #f56c6c">{{ scope.row.losing_trades }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { getProjectPerformance, getStrategiesPerformance, clearPerformanceCache } from '@/api/performance'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const timeRange = ref('1month')
const customTimeRange = ref([])
const performanceData = ref(null)
const strategiesData = ref({})

// 计算属性：策略表格数据
const strategiesTableData = computed(() => {
  if (!strategiesData.value || Object.keys(strategiesData.value).length === 0) {
    return []
  }
  
  return Object.values(strategiesData.value).map(strategy => ({
    strategy_name: strategy.strategy_name || `策略${strategy.strategy_id || strategy.id}`,
    total_pnl: strategy.total_pnl || 0,
    win_rate: strategy.win_rate || 0,
    profit_loss_ratio: strategy.profit_loss_ratio || 0,
    avg_holding_time: strategy.avg_holding_time || 0,
    total_trades: strategy.total_trades || 0,
    winning_trades: strategy.winning_trades || 0,
    losing_trades: strategy.losing_trades || 0
  }))
})

// 图表引用
const equityChartRef = ref(null)
const equityChart = ref(null)

// 时间范围处理
const handleTimeRangeChange = () => {
  if (timeRange.value !== 'custom') {
    const now = new Date()
    let startTime = new Date()
    
    switch (timeRange.value) {
      case '3months':
        startTime.setMonth(now.getMonth() - 3)
        break
      case '1month':
        startTime.setMonth(now.getMonth() - 1)
        break
      case '1week':
        startTime.setDate(now.getDate() - 7)
        break
    }
    
    fetchData(startTime, now)
  }
}

const handleCustomTimeChange = () => {
  if (customTimeRange.value && customTimeRange.value.length === 2) {
    fetchData(new Date(customTimeRange.value[0]), new Date(customTimeRange.value[1]))
  }
}

const refreshData = () => {
  if (timeRange.value === 'custom' && customTimeRange.value.length === 2) {
    fetchData(new Date(customTimeRange.value[0]), new Date(customTimeRange.value[1]))
  } else {
    handleTimeRangeChange()
  }
}

const clearCache = async () => {
  try {
    await clearPerformanceCache()
    ElMessage.success('缓存清除成功')
    refreshData()
  } catch (error) {
    console.error('清除缓存失败:', error)
    ElMessage.error('清除缓存失败')
  }
}

// 数据获取
const fetchData = async (startTime, endTime) => {
  loading.value = true
  try {
    const params = {
      start_time: startTime?.toISOString()
    }
    
    // 只有在自定义时间范围时才传递 end_time
    if (timeRange.value === 'custom' && endTime) {
      params.end_time = endTime.toISOString()
    }
    
    // 并行获取所有数据
    const [performanceResponse, strategiesResponse] = await Promise.all([
      getProjectPerformance(params),
      getStrategiesPerformance(params)
    ])
    
    performanceData.value = performanceResponse.data
    strategiesData.value = strategiesResponse.data || {}
    
    console.log('前端接收到的数据:')
    console.log('performanceData:', performanceData.value)
    console.log('strategiesData:', strategiesData.value)
    
    if (strategiesData.value && Object.keys(strategiesData.value).length > 0) {
      const firstStrategy = Object.values(strategiesData.value)[0]
      console.log('第一个策略数据结构:', firstStrategy)
      console.log('策略字段:', Object.keys(firstStrategy))
    }
    

    
    // 更新图表
    nextTick(() => {
      nextTick(() => {
        updateEquityChart()
      })
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    ElMessage.error('获取性能数据失败')
  } finally {
    loading.value = false
  }
}

// 初始化图表的通用函数
const initChart = (chartRef, chartInstance, updateFunction) => {
  if (!chartInstance.value && chartRef.value) {
    nextTick(() => {
      try {
        chartInstance.value = echarts.init(chartRef.value)
        updateFunction()
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    })
  } else if (!chartRef.value) {
    nextTick(() => {
      initChart(chartRef, chartInstance, updateFunction)
    })
  }
}

// 累计盈利曲线图表更新
const updateEquityChart = () => {
  if (!strategiesData.value || Object.keys(strategiesData.value).length === 0) {
    return
  }
  
  if (!equityChart.value) {
    initChart(equityChartRef, equityChart, updateEquityChartData)
    return
  }
  
  updateEquityChartData()
}

const updateEquityChartData = () => {
  if (!equityChart.value) {
    return
  }
  
  // 确保 strategiesData.value 有数据
  if (!strategiesData.value || Object.keys(strategiesData.value).length === 0) {
    console.log('strategiesData 为空:', strategiesData.value)
    return
  }
  
      try {
      // 为每个策略生成累计盈利数据
      const series = []
      const legendData = []
      let allTimePoints = []
      
      console.log('开始处理策略数据:', strategiesData.value)
      
      // 收集所有时间点
      Object.values(strategiesData.value).forEach(strategy => {
        if (strategy.profit_curve && strategy.profit_curve.length > 0) {
          const timePoints = strategy.profit_curve.map(point => point.time)
          allTimePoints = [...new Set([...allTimePoints, ...timePoints])]
        }
      })
      
      // 按时间排序
      allTimePoints.sort()
      console.log('时间点数量:', allTimePoints.length)
      
      Object.values(strategiesData.value).forEach((strategy, index) => {
        const strategyName = strategy.strategy_name || `策略${strategy.strategy_id}`
        legendData.push(strategyName)
        
        // 从profit_curve中提取数据（后端已保证所有策略都有相同长度的数据）
        let seriesData = []
        if (strategy.profit_curve && strategy.profit_curve.length > 0) {
          seriesData = strategy.profit_curve.map(point => parseFloat(point.value || 0))
        } else {
          // 如果没有曲线数据，使用0填充，长度与时间点一致
          seriesData = new Array(allTimePoints.length || 1).fill(0)
        }
        
        console.log(`策略 ${strategyName}: 数据长度=${seriesData.length}, 时间点长度=${allTimePoints.length}`)
        
        // 确保数据有效性
        if (seriesData.length === 0) {
          seriesData = [0]
        }
        
        const seriesConfig = {
          name: strategyName,
          type: 'line',
          data: seriesData,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2
          }
        }
        
        console.log(`策略 ${strategyName} 配置:`, seriesConfig)
        series.push(seriesConfig)
      })
      
      // 使用时间点作为X轴数据
      const xAxisData = allTimePoints.length > 0 ? 
        allTimePoints.map(time => formatDateTime(time)) : 
        ['累计盈利']
    
    const option = {
      title: {
        text: '',
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params) {
          let result = '累计盈利<br/>'
          params.forEach(param => {
            result += `${param.seriesName}: ${param.value.toFixed(2)} USDT<br/>`
          })
          return result
        }
      },
      legend: {
        data: legendData,
        top: '5%',
        left: 'center'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData
      },
      yAxis: {
        type: 'value',
        name: '累计盈利 (USDT)',
        nameTextStyle: {
          color: '#67c23a'
        }
      },
      series: series
    }
    
    console.log('最终 option 配置:', option)
    console.log('series 数量:', series.length)
    console.log('legendData:', legendData)
    console.log('xAxisData 长度:', xAxisData.length)
    
    if (equityChart.value) {
      try {
        // 直接销毁并重新创建图表实例，避免ECharts内部状态问题
        equityChart.value.dispose()
        equityChart.value = echarts.init(equityChartRef.value)
        equityChart.value.setOption(option)
        
        // 设置图例交互
        equityChart.value.on('legendselectchanged', function (params) {
          console.log('图例点击:', params.name, '选中状态:', params.selected[params.name])
        })
        
        console.log('图表重新创建成功')
      } catch (chartError) {
        console.error('图表创建失败:', chartError)
      }
    }
  } catch (error) {
    console.error('更新资产曲线图表失败:', error)
  }
}





// 格式化函数
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00'
  const num = parseFloat(value)
  return num.toFixed(decimals)
}

const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0.00%'
  const num = parseFloat(value)
  return (num * 100).toFixed(2) + '%'
}

// 窗口大小变化处理
const handleResize = () => {
  if (equityChart.value) {
    equityChart.value.resize()
  }
}

// 生命周期
onMounted(() => {
  // 获取初始数据
  handleTimeRangeChange()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (equityChart.value) {
    equityChart.value.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-performance {
  padding: 24px;
  background: #f5f6fa;
  min-height: 100vh;
}

/* 性能指标卡片样式 */
.performance-metrics {
  padding-left: 8px;
  margin-bottom: 16px;
}

.metric-card {
  height: 80px;
  padding: 16px;
  border-radius: 4px;
  background-color: #100c2a;
  border: 1px solid rgb(233, 239, 239);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}

.header {
  margin-bottom: 16px;
  padding-left: 10px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.time-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.custom-time {
  margin-left: 16px;
}

.action-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-chart {
  min-height: 400px;
}

/* 给图表列添加间距 */
.el-col {
  padding: 5px;
}

/* 确保图表容器有明确的高度 */
.el-row {
  margin-bottom: 16px;
}

.el-col .chart-wrapper {
  min-height: 320px;
  height: 320px;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  padding: 5px;
  position: relative;
}

.chart1, .chart2 {
  width: 100% !important;
  height: 100% !important;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.chart1 {
  min-height: 400px;
}

.chart2 {
  min-height: 320px;
}

/* 主图表的容器高度 */
.main-chart .chart-wrapper {
  min-height: 400px;
  height: 400px;
}

.time-controls .el-radio-button__inner {
  padding: 6px 12px;
  font-size: 12px;
}

.custom-time .el-date-editor {
  font-size: 12px;
}

/* 表格样式 */
.table-card {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.table-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.table-content {
  padding: 0;
}

.table-content .el-table {
  border: none;
}

.table-content .el-table th {
  background: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
}

.table-content .el-table td {
  border-bottom: 1px solid #ebeef5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-performance {
    padding: 16px;
  }
  
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .time-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .custom-time {
    margin-left: 0;
    margin-top: 16px;
  }
}
</style>