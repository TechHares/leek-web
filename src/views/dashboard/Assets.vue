<template>
  <div class="dashboard-assets">
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
        
        <!-- 数据切换 -->
        <div class="data-toggle">
          <el-radio-group v-model="dataType" @change="handleDataTypeChange" size="small">
            <el-radio-button value="rate">比值</el-radio-button>
            <el-radio-button value="amount">数值</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>
    
    <div class="content">
    <el-row>
        <el-col :span="24">
            <div v-if="assetData.length === 0" class="no-data">
            <el-empty description="暂无资产快照数据" />
          </div>
          <div v-else-if="assetData.length === 1" class="single-data">
            <div class="single-data-info">
              <h3>当前资产总额</h3>
              <div class="amount">{{ formatAmount(assetData[0].total_amount) }} USDT</div>
              <p>数据时间: {{ formatDateTime(assetData[0].snapshot_time) }}</p>
            </div>
          </div>
          <div v-else class="chart-wrapper">
            <div ref="assetChartRef" class="chart1"></div>
          </div>
        </el-col>
    </el-row>
        <!-- 性能指标卡片 -->
    <el-row :gutter="16" class="performance-metrics">
      <el-col :span="6">
        <div class="metric-card">
          <el-statistic 
            :value="(performanceMetrics?.annualized_return || 0) * 100" 
            :precision="2" 
            suffix="%" 
            :value-style="{
              color: (performanceMetrics?.annualized_return||0)>0?'#67c23a':'#f56c6c',
              '--el-statistic-content-color': (performanceMetrics?.annualized_return||0)>0?'#67c23a':'#f56c6c'
            }">
            <template #title>
              <div style="display: inline-flex; align-items: center;color: #606266;">
                年化收益率
                <el-tooltip effect="light" content="年化收益率，反映投资回报的年化水平" placement="top">
                  <el-icon style="margin-left: 4px" :size="12">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-statistic>
          <div class="metric-footer">
            <div class="footer-item">
              <span style="color: #909399;">对比上期</span>
              <span :class="getComparisonClass(performanceMetrics?.annualized_return, periodComparison?.previous?.annualized_return)">
                {{ formatComparison(performanceMetrics?.annualized_return, periodComparison?.previous?.annualized_return) }}
                <el-icon v-if="hasComparison(performanceMetrics?.annualized_return, periodComparison?.previous?.annualized_return)">
                  <CaretTop v-if="getComparisonValue(performanceMetrics?.annualized_return, periodComparison?.previous?.annualized_return) > 0" />
                  <CaretBottom v-else-if="getComparisonValue(performanceMetrics.annualized_return, periodComparison?.previous?.annualized_return) < 0" />
                </el-icon>
              </span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <el-statistic 
            :value="(performanceMetrics?.max_drawdown?.max_drawdown || 0) * 100" 
            :precision="2" 
            suffix="%" 
            :value-style="{ 
              color: '#f56c6c',
            }">
            <template #title>
              <div style="display: inline-flex; align-items: center;color: #606266;">
                最大回撤
                <el-tooltip effect="light" content="最大回撤，反映投资风险的最大损失幅度" placement="top">
                  <el-icon style="margin-left: 4px" :size="12">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-statistic>
          <div class="metric-footer">
            <div class="footer-item">
              <span style="color: #909399;">对比上期</span>
              <span :class="getComparisonClass(performanceMetrics?.max_drawdown?.max_drawdown, periodComparison?.previous?.max_drawdown?.max_drawdown, true)">
                {{ formatComparison(performanceMetrics?.max_drawdown?.max_drawdown, periodComparison?.previous?.max_drawdown?.max_drawdown, true) }}
                <el-icon v-if="hasComparison(performanceMetrics?.max_drawdown?.max_drawdown, periodComparison?.previous?.max_drawdown?.max_drawdown)">
                  <CaretTop v-if="getComparisonValue(performanceMetrics?.max_drawdown?.max_drawdown, periodComparison?.previous?.max_drawdown?.max_drawdown, true) > 0" />
                  <CaretBottom v-else-if="getComparisonValue(performanceMetrics?.max_drawdown?.max_drawdown, periodComparison?.previous?.max_drawdown?.max_drawdown, true) < 0" />
                </el-icon>
              </span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <el-statistic 
            :value="(performanceMetrics?.volatility || 0) * 100" 
            :precision="2" 
            suffix="%">
            <template #title>
              <div style="display: inline-flex; align-items: center;color: #606266;">
                波动率
                <el-tooltip effect="light" content="年化波动率，反映投资组合的风险水平" placement="top">
                  <el-icon style="margin-left: 4px" :size="12">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-statistic>
          <div class="metric-footer">
            <div class="footer-item">
              <span style="color: #909399;">对比上期</span>
              <span :class="getComparisonClass(performanceMetrics?.volatility, periodComparison?.previous?.volatility, true)">
                {{ formatComparison(performanceMetrics?.volatility, periodComparison?.previous?.volatility, true) }}
                <el-icon v-if="hasComparison(performanceMetrics?.volatility, periodComparison?.previous?.volatility)">
                  <CaretTop v-if="getComparisonValue(performanceMetrics?.volatility, periodComparison?.previous?.volatility, true) > 0" />
                  <CaretBottom v-else-if="getComparisonValue(performanceMetrics?.volatility, periodComparison?.previous?.volatility, true) < 0" />
                </el-icon>
              </span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <el-statistic :value="performanceMetrics?.sharpe_ratio || 0" :precision="2" :value-style="{color: '#303133'}">
            <template #title>
              <div style="display: inline-flex; align-items: center;color: #606266;">
                夏普比率
                <el-tooltip effect="light" content="夏普比率，反映风险调整后的收益水平" placement="top">
                  <el-icon style="margin-left: 4px" :size="12">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-statistic>
          <div class="metric-footer">
            <div class="footer-item">
              <span style="color: #909399;">对比上期</span>
              <span :class="getComparisonClass(performanceMetrics?.sharpe_ratio, periodComparison?.previous?.sharpe_ratio)">
                {{ formatComparison(performanceMetrics?.sharpe_ratio, periodComparison?.previous?.sharpe_ratio) }}
                <el-icon v-if="hasComparison(performanceMetrics?.sharpe_ratio, periodComparison?.previous?.sharpe_ratio)">
                  <CaretTop v-if="getComparisonValue(performanceMetrics?.sharpe_ratio, periodComparison?.previous?.sharpe_ratio) > 0" />
                  <CaretBottom v-else-if="getComparisonValue(performanceMetrics?.sharpe_ratio, periodComparison?.previous?.sharpe_ratio) < 0" />
                </el-icon>
              </span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row>
        <el-col :span="12" class="chart-card main-chart">
            <div v-if="strategyPnlData.length === 0" class="no-data">
              <el-empty description="暂无策略盈利数据" />
            </div>
            <div v-else class="chart-wrapper">
              <div ref="pnlChartRef" class="chart2"></div>
            </div>
        </el-col>
        <el-col :span="12">
            <div v-if="strategyFeeData.length === 0" class="no-data">
              <el-empty description="暂无手续费数据" />
            </div>
            <div v-else class="chart-wrapper">
              <div ref="feeChartRef" class="chart2"></div>
            </div>
        </el-col>
    </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getDashboardAsset } from '@/api/dashboard'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { InfoFilled, CaretTop, CaretBottom } from '@element-plus/icons-vue'

// 响应式数据
const timeRange = ref('1month')
const dataType = ref('rate')
const customTimeRange = ref([])
const assetChartRef = ref(null)
const pnlChartRef = ref(null)
const feeChartRef = ref(null)
const assetChart = ref(null)
const pnlChart = ref(null)
const feeChart = ref(null)
const assetData = ref([])
const strategyPnlData = ref([])
const strategyFeeData = ref([])
const performanceMetrics = ref(null)
const periodComparison = ref(null)

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

const handleDataTypeChange = () => {
  updateAssetChart()
  updatePnlChart()
  // 注意：费盈比数据不受比值和数值开关影响，所以不需要重新计算
}

// 数据获取
const fetchData = async (startTime, endTime) => {
  try {
    const params = {
      start_time: startTime?.toISOString()
    }
    
    // 只有在自定义时间范围时才传递 end_time
    if (timeRange.value === 'custom' && endTime) {
      params.end_time = endTime.toISOString()
    }
    
    const response = await getDashboardAsset(params)
    
    if (response.data) {
      assetData.value = response.data.asset_snapshots || []
      strategyPnlData.value = response.data.strategy_pnl || []
      strategyFeeData.value = response.data.strategy_fee || []
      performanceMetrics.value = response.data.performance_metrics || null
      periodComparison.value = response.data.period_comparison || null
      
  }
  
  // 使用多个nextTick确保DOM完全渲染
  nextTick(() => {
    nextTick(() => {
      nextTick(() => {
        console.log('Updating charts after DOM render...')
        updateAssetChart()
        updatePnlChart()
        updateFeeChart()
      })
    })
  })
  } catch (error) {
    console.error('Error fetching data:', error)
    ElMessage.error('获取资产数据失败')
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

// 资产快照图表更新
const updateAssetChart = () => {
  
  if (assetData.value.length <= 1) {
    return
  }
  
  if (!assetChart.value) {
    initChart(assetChartRef, assetChart, updateAssetChartData)
    return
  }
  
  updateAssetChartData()
}

// 更新资产快照图表数据
const updateAssetChartData = () => {
  if (!assetChart.value || assetData.value.length <= 1) {
    return
  }
  
  try {
    const sortedData = [...assetData.value].sort((a, b) => 
      new Date(a.snapshot_time) - new Date(b.snapshot_time)
    )
    
    const xAxisData = sortedData.map(item => formatDateTime(item.snapshot_time))
    
    // 左轴数据：收益
    const seriesData = sortedData.map(item => {
      if (dataType.value === 'rate') {
        const firstAmount = parseFloat(sortedData[0].total_amount)
        const currentAmount = parseFloat(item.total_amount)
        const rate = ((currentAmount - firstAmount) / firstAmount * 100)
        return isNaN(rate) ? 0 : parseFloat(rate.toFixed(4))
      } else {
        const amount = parseFloat(item.total_amount - sortedData[0].total_amount)
        return isNaN(amount) ? 0 : amount
      }
    })
    
    const validSeriesData = seriesData.map(value => {
      const num = parseFloat(value)
      return isNaN(num) ? 0 : num
    })
    
    // 右轴数据：abs(fee)/pnl * 1000 (千分号)
    const feePnlRatioData = sortedData.map(item => {
      const fee = Math.abs(parseFloat(item.fee || 0))
      const pnl = parseFloat(item.pnl || 0)
      if (pnl === 0) return 0
      const ratio = (fee / pnl) * 1000
      const result = isNaN(ratio) ? 0 : parseFloat(ratio.toFixed(2))
      // 费用比限制最小0
      return Math.max(0, result)
    })
    
    const option = {
      title: {
        text: '收益',
        left: 'center',
        textStyle: {
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
        type: 'cross'
        },
        formatter: function(params) {
          let result = params[0].axisValue + '<br/>'
          params.forEach(param => {
            if (param.seriesName === '收益') {
              const value = dataType.value === 'rate' ? param.value + '%' : param.value + ' USDT'
              result += `${param.seriesName}: ${value}<br/>`
            } else if (param.seriesName === '费盈比') {
              result += `${param.seriesName}: ${param.value}‰<br/>`
            }
          })
          return result
        }
      },
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            yAxisIndex: false,
            xAxisIndex: 0
          },
          restore: {},
          saveAsImage: {}
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        id: 'xAxis0',
        type: 'category',
        boundaryGap: false,
        data: xAxisData
      },
      yAxis: [
        {
          id: 'yAxis0',
          type: 'value',
          name: dataType.value === 'rate' ? '收益率 (%)' : '收益 (USDT)',
          nameTextStyle: {
            color: '#67c23a'
          },
          axisLabel: {
            color: '#67c23a'
          },
          axisLine: {
            lineStyle: {
              color: '#67c23a'
            }
          }
        },
        {
          id: 'yAxis1',
          type: 'value',
          name: '费盈比 (‰)',
          nameTextStyle: {
            color: '#FFD700'
          },
          axisLabel: {
            color: '#FFD700',
            formatter: '{value}‰'
          },
          axisLine: {
            lineStyle: {
              color: '#FFD700'
            }
          }
        }
      ],
      series: [
        {
          name: '收益',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          smooth: true,
          itemStyle: {
            color: '#67c23a'
          },
          lineStyle: {
            color: '#67c23a'
          },
          data: validSeriesData,
          markPoint: {
            data: [
              { type: 'max', name: '高点', itemStyle: { color: '#67c23a' } },
              { type: 'min', name: '低点', itemStyle: { color: '#f56c6c' } }
            ],
            label: {
              formatter: function(params) {
                const value = parseFloat(params.value)
                if (dataType.value === 'rate') {
                  return value.toFixed(2) + '%'
                } else {
                  return value.toFixed(2) + ' USDT'
                }
              }
            }
          }
        },
        {
          name: '费盈比',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 1,
          showSymbol: false,
          smooth: true,
          itemStyle: {
            color: '#FFD700'
          },
          lineStyle: {
            color: '#FFD700'
          },
          data: feePnlRatioData
        }
      ]
    }
    
    if (assetChart.value) {
      assetChart.value.setOption(option, true)
    }
  } catch (error) {
    console.log(error)
  }
}

// 策略盈利图表更新
const updatePnlChart = () => {
  if (strategyPnlData.value.length === 0) {
    return
  }
  
  if (!pnlChart.value) {
    initChart(pnlChartRef, pnlChart, updatePnlChartData)
    return
  }
  
  updatePnlChartData()
}

// 更新策略盈利图表数据
const updatePnlChartData = () => {
  if (!pnlChart.value || strategyPnlData.value.length === 0) {
    return
  }
  
  try {
    const xAxisData = strategyPnlData.value.map(item => item.strategy_name)
    
    // 根据数据类型计算系列数据
    let seriesData, seriesName, yAxisName, tooltipFormatter
    
    if (dataType.value === 'rate') {
      // 比值模式：计算百分比
      const totalPnl = strategyPnlData.value.reduce((sum, item) => sum + Math.abs(parseFloat(item.total_pnl)), 0)
      seriesData = strategyPnlData.value.map(item => {
        const pnl = parseFloat(item.total_pnl)
        const rate = totalPnl > 0 ? (Math.abs(pnl) / totalPnl * 100) : 0
        return parseFloat(rate.toFixed(2))
      })
      seriesName = '策略占比'
      yAxisName = '占比 (%)'
      tooltipFormatter = function(params) {
        const data = params[0];
        return `${data.name}<br/>占比: ${data.value}%`;
      }
    } else {
      // 数值模式：显示实际盈利
      seriesData = strategyPnlData.value.map(item => parseFloat(item.total_pnl))
      seriesName = '策略盈利'
      yAxisName = '盈利 (USDT)'
      tooltipFormatter = function(params) {
        const data = params[0];
        return `${data.name}<br/>盈利: ${data.value} USDT`;
      }
    }
    
    const option = {
      title: {
        text: '策略',
        left: 'center',
        textStyle: {
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: tooltipFormatter
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        id: 'xAxis0',
        type: 'category',
        data: xAxisData,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        id: 'yAxis0',
        type: 'value',
        name: yAxisName,
        nameTextStyle: {
          color: '#303133'
        }
      },
      series: [
        {
          name: seriesName,
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: seriesData,
          itemStyle: {
            color: function(params) {
              if (dataType.value === 'rate') {
                return '#409EFF' // 比值模式使用蓝色
              }
              return params.data >= 0 ? '#67c23a' : '#f56c6c';
            }
          }
        }
      ]
    }
    
    if (pnlChart.value) {
      pnlChart.value.setOption(option, true)
    }
  } catch (error) {
    console.log(error)
    // 图表更新失败
  }
}

// 手续费图表更新
const updateFeeChart = () => {
  if (strategyFeeData.value.length === 0) {
    return
  }
  
  if (!feeChart.value) {
    initChart(feeChartRef, feeChart, updateFeeChartData)
    return
  }
  
  updateFeeChartData()
}

// 更新手续费图表数据
const updateFeeChartData = () => {
  if (!feeChart.value || strategyFeeData.value.length === 0) {
    return
  }
  
  try {
    const seriesData = strategyFeeData.value.map(item => ({
      name: item.strategy_name,
      value: Math.abs(item.total_fee) // 使用绝对值，避免负值问题
    }))
    
    const option = {
      title: {
        text: '手续费',
        left: 'center',
        textStyle: {
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          return `${params.name}<br/>手续费: ${params.value} USDT (绝对值)<br/>占比: ${params.percent}%`;
        }
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '手续费分布',
          type: 'pie',
          radius: '50%',
          data: seriesData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    
    if (feeChart.value) {
      feeChart.value.setOption(option, true)
    }
  } catch (error) {
    console.log(error)
  }
}

// 格式化函数
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  // 使用本地时间，因为后端存储的是本地时间
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatAmount = (amount) => {
  if (!amount) return '0.00'
  const num = parseFloat(amount)
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
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

const formatComparison = (current, previous, reverse = false) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return '0.00%'
  }
  
  const currentNum = parseFloat(current)
  const previousNum = parseFloat(previous)
  
  if (previousNum === 0) {
    return currentNum > 0 ? '+∞' : currentNum < 0 ? '-∞' : '0.00%'
  }
  
  const change = ((currentNum - previousNum) / Math.abs(previousNum)) * 100
  
  if (reverse) {
    // 对于回撤和波动率，数值越小越好
    const sign = change < 0 ? '+' : change > 0 ? '-' : ''
    return `${sign}${Math.abs(change).toFixed(2)}%`
  } else {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }
}

const getComparisonValue = (current, previous, reverse = false) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return 0
  }
  
  const currentNum = parseFloat(current)
  const previousNum = parseFloat(previous)
  
  if (previousNum === 0) {
    return currentNum
  }
  
  const change = ((currentNum - previousNum) / Math.abs(previousNum)) * 100
  
  if (reverse) {
    // 对于回撤和波动率，数值越小越好
    return -change
  } else {
    return change
  }
}

const hasComparison = (current, previous) => {
  return current !== null && current !== undefined && 
         previous !== null && previous !== undefined
}

const getComparisonClass = (current, previous, reverse = false) => {
  const value = getComparisonValue(current, previous, reverse)
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return ''
}

// 生命周期
onMounted(() => {
  
  // 获取初始数据
  handleTimeRangeChange()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (assetChart.value) {
    assetChart.value.dispose()
  }
  if (pnlChart.value) {
    pnlChart.value.dispose()
  }
  if (feeChart.value) {
    feeChart.value.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (assetChart.value) {
    assetChart.value.resize()
  }
  if (pnlChart.value) {
    pnlChart.value.resize()
  }
  if (feeChart.value) {
    feeChart.value.resize()
  }
}
</script>

<style scoped>
.dashboard-assets {
  padding: 24px;
  background: #f5f6fa;
  min-height: 100vh;
}

/* 性能指标卡片样式 */
.performance-metrics {
  padding-left: 8px;
}

.metric-card {
  height: 80px;
  padding: 16px;
  border-radius: 4px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.metric-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 0;
  flex-shrink: 0;
}

.metric-footer .footer-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.metric-footer .footer-item span:last-child {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.header {
  margin-bottom: 0px;
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

.data-toggle {
  display: flex;
  align-items: center;
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

.single-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.single-data-info {
  text-align: center;
}

.single-data-info h3 {
  color: #606266;
  margin-bottom: 16px;
}

.single-data-info .amount {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 16px;
}

.single-data-info p {
  color: #909399;
  font-size: 14px;
}

.time-controls .el-radio-group {
  font-size: 12px;
}

.data-toggle .el-radio-group {
  font-size: 12px;
}

.chart1 {
  min-height: 320px;
}

.chart2 {
  min-height: 400px;
}

/* 第二个图表的容器高度 */
.main-chart .chart-wrapper {
  min-height: 400px;
  height: 400px;
}

.time-controls .el-radio-button__inner {
  padding: 6px 12px;
  font-size: 12px;
}

.data-toggle .el-radio-button__inner {
  padding: 6px 12px;
  font-size: 12px;
}

.custom-time .el-date-editor {
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-assets {
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