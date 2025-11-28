<template>
  <div class="factor-detail-charts">
    <!-- Symbol和Timeframe选择器 -->
    <div v-if="chartData && ((chartData.ic_data && chartData.ic_data.length > 0) || chartData.ic_data_merged)" style="margin-bottom: 20px;">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-select
            v-model="selectedSymbol"
            placeholder="选择Symbol（可选）"
            clearable
            multiple
            :disabled="showMerged"
            style="width: 100%;"
            @change="handleFilterChange"
          >
            <el-option
              v-for="symbol in availableSymbols"
              :key="symbol"
              :label="symbol"
              :value="symbol"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select
            v-model="selectedTimeframe"
            placeholder="选择Timeframe（可选）"
            clearable
            multiple
            :disabled="showMerged"
            style="width: 100%;"
            @change="handleFilterChange"
          >
            <el-option
              v-for="tf in availableTimeframes"
              :key="tf"
              :label="tf"
              :value="tf"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-checkbox v-model="showMerged" @change="handleFilterChange">
            显示合并后的IC序列
          </el-checkbox>
        </el-col>
      </el-row>
    </div>

    <!-- 所有图表直接显示 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="icTimeSeriesChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="layeredBacktestChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="icDistributionChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="longShortChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="monthlyHeatmapChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom: 20px;">
          <div ref="autocorrelationChartRef" style="width: 100%; height: 500px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'FactorDetailCharts',
  props: {
    chartData: {
      type: Object,
      default: null
    },
    factorId: {
      type: [Number, String],
      default: null
    }
  },
  data() {
    return {
      selectedSymbol: [],
      selectedTimeframe: [],
      showMerged: true,
      icTimeSeriesChart: null,
      layeredBacktestChart: null,
      icDistributionChart: null,
      longShortChart: null,
      monthlyHeatmapChart: null,
      autocorrelationChart: null,
      renderTimer: null,
      filterTimer: null,
      isInitialized: false,
      lastFactorId: null,
      isUpdatingSelection: false
    }
  },
  computed: {
    availableSymbols() {
      if (!this.chartData || !this.chartData.ic_data) return []
      const symbols = new Set()
      this.chartData.ic_data.forEach(item => {
        if (item.symbol) symbols.add(item.symbol)
      })
      return Array.from(symbols).sort()
    },
    availableTimeframes() {
      if (!this.chartData || !this.chartData.ic_data) return []
      const timeframes = new Set()
      this.chartData.ic_data.forEach(item => {
        if (item.timeframe) timeframes.add(item.timeframe)
      })
      return Array.from(timeframes).sort()
    }
  },
  watch: {
    factorId: {
      handler(newVal, oldVal) {
        // 切换因子时，重置状态
        if (oldVal !== null && oldVal !== undefined && newVal !== oldVal) {
          // 设置标志位，防止触发 watch
          this.isUpdatingSelection = true
          this.selectedSymbol = []
          this.selectedTimeframe = []
          this.showMerged = true
          this.isInitialized = false
          this.lastFactorId = newVal
          // 清除标志位
          this.$nextTick(() => {
            this.isUpdatingSelection = false
          })
        } else if (oldVal === null || oldVal === undefined) {
          this.lastFactorId = newVal
        }
      },
      immediate: true
    },
    chartData: {
      handler(newVal, oldVal) {
        // 避免初始化时重复触发
        if (!newVal) return
        
        this.$nextTick(() => {
          // 检查是否切换了因子（通过 factorId 判断）
          const factorChanged = this.lastFactorId !== null && this.factorId !== null && 
                                this.lastFactorId !== this.factorId
          
          // 设置标志位，防止触发 watch
          this.isUpdatingSelection = true
          
          // 如果切换了因子，需要重置选择（factorId watch 已经处理了，这里只需要确保状态正确）
          if (factorChanged && this.showMerged) {
            // 确保选择已清空（factorId watch 已经处理）
            this.selectedSymbol = []
            this.selectedTimeframe = []
          } else if (!this.showMerged) {
            // 如果未选中合并后的IC序列，检查当前选择是否在新数据中存在
            const validSymbols = this.selectedSymbol.filter(s => this.availableSymbols.includes(s))
            const validTimeframes = this.selectedTimeframe.filter(t => this.availableTimeframes.includes(t))
            
            // 只在值真正需要改变时才修改，避免不必要的触发
            const needsSymbolUpdate = (validSymbols.length === 0 && this.availableSymbols.length > 0) ||
                                     (validSymbols.length > 0 && JSON.stringify(validSymbols) !== JSON.stringify(this.selectedSymbol))
            const needsTimeframeUpdate = (validTimeframes.length === 0 && this.availableTimeframes.length > 0) ||
                                        (validTimeframes.length > 0 && JSON.stringify(validTimeframes) !== JSON.stringify(this.selectedTimeframe))
            
            if (needsSymbolUpdate) {
              if (validSymbols.length === 0 && this.availableSymbols.length > 0) {
                this.selectedSymbol = [this.availableSymbols[0]]
              } else if (validSymbols.length > 0) {
                this.selectedSymbol = validSymbols
              }
            }
            
            if (needsTimeframeUpdate) {
              if (validTimeframes.length === 0 && this.availableTimeframes.length > 0) {
                this.selectedTimeframe = [this.availableTimeframes[0]]
              } else if (validTimeframes.length > 0) {
                this.selectedTimeframe = validTimeframes
              }
            }
          }
          
          // 清除标志位
          this.$nextTick(() => {
            this.isUpdatingSelection = false
          })
          
          // 更新 lastFactorId
          if (this.factorId !== null) {
            this.lastFactorId = this.factorId
          }
          
          // 使用 renderCharts 方法，内部已有防抖机制
          this.renderCharts()
          // 标记为已初始化（如果之前未初始化）
          if (!this.isInitialized) {
            this.isInitialized = true
          }
        })
      },
      deep: true,
      immediate: false
    },
    showMerged(newVal, oldVal) {
      // 避免初始化时触发
      if (oldVal === undefined) return
      
      // 设置标志位，防止触发 watch
      this.isUpdatingSelection = true
      
      if (!newVal) {
        // 当取消选中合并后的IC序列时，默认选择第一个选项
        this.$nextTick(() => {
          if (this.availableSymbols.length > 0 && this.selectedSymbol.length === 0) {
            this.selectedSymbol = [this.availableSymbols[0]]
          }
          if (this.availableTimeframes.length > 0 && this.selectedTimeframe.length === 0) {
            this.selectedTimeframe = [this.availableTimeframes[0]]
          }
          
          // 清除标志位后再触发请求
          this.$nextTick(() => {
            this.isUpdatingSelection = false
            this.handleFilterChange()
            // 不在这里调用 renderCharts，selectedSymbol 和 selectedTimeframe 的 watch 会处理
          })
        })
      } else {
        // 当选中合并后的IC序列时，清空选择
        this.selectedSymbol = []
        this.selectedTimeframe = []
        
        // 清除标志位后再触发请求
        this.$nextTick(() => {
          this.isUpdatingSelection = false
          this.handleFilterChange()
          // 需要重新渲染以显示合并数据
          this.renderCharts()
        })
      }
    },
    selectedSymbol(newVal, oldVal) {
      // 避免初始化时触发，或者正在更新选择时触发
      if (oldVal === undefined || this.isUpdatingSelection) return
      if (!this.showMerged) {
        this.handleFilterChange()
        this.renderCharts()
      }
    },
    selectedTimeframe(newVal, oldVal) {
      // 避免初始化时触发，或者正在更新选择时触发
      if (oldVal === undefined || this.isUpdatingSelection) return
      if (!this.showMerged) {
        this.handleFilterChange()
        this.renderCharts()
      }
    }
  },
  mounted() {
    // 组件挂载后，如果有数据则渲染图表
    if (this.chartData) {
      this.$nextTick(() => {
        // 设置标志位，防止触发 watch
        this.isUpdatingSelection = true
        
        // 如果默认是合并模式，直接渲染
        if (this.showMerged) {
          this.renderCharts()
        } else {
          // 否则设置默认值并渲染
          if (this.availableSymbols.length > 0 && this.selectedSymbol.length === 0) {
            this.selectedSymbol = [this.availableSymbols[0]]
          }
          if (this.availableTimeframes.length > 0 && this.selectedTimeframe.length === 0) {
            this.selectedTimeframe = [this.availableTimeframes[0]]
          }
          this.renderCharts()
        }
        
        // 清除标志位
        this.$nextTick(() => {
          this.isUpdatingSelection = false
          this.isInitialized = true
        })
      })
    }
  },
  beforeUnmount() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer)
      this.renderTimer = null
    }
    if (this.filterTimer) {
      clearTimeout(this.filterTimer)
      this.filterTimer = null
    }
    this.destroyAllCharts()
  },
  methods: {
    handleFilterChange() {
      // 初始化阶段不触发请求，避免重复请求
      if (!this.isInitialized) return
      
      // 防抖处理，避免频繁触发请求
      if (this.filterTimer) {
        clearTimeout(this.filterTimer)
      }
      this.filterTimer = setTimeout(() => {
        this.$emit('filter-change', {
          symbol: this.selectedSymbol,
          timeframe: this.selectedTimeframe,
          merged: this.showMerged
        })
        this.filterTimer = null
      }, 300)
    },
    renderCharts() {
      if (!this.chartData) return
      
      // 清除之前的定时器，避免频繁调用
      if (this.renderTimer) {
        clearTimeout(this.renderTimer)
      }
      
      this.renderTimer = setTimeout(() => {
        this.renderICTimeSeriesChart()
        this.renderLayeredBacktestChart()
        this.renderICDistributionChart()
        this.renderLongShortChart()
        this.renderMonthlyHeatmapChart()
        this.renderAutocorrelationChart()
        this.renderTimer = null
      }, 100)
    },
    renderICTimeSeriesChart() {
      if (!this.$refs.icTimeSeriesChartRef || !this.chartData) return
      
      const container = this.$refs.icTimeSeriesChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderICTimeSeriesChart(), 100)
        return
      }
      
      this.destroyChart('ic-timeseries')
      this.icTimeSeriesChart = echarts.init(container)
      
      const series = []
      
      if (this.showMerged) {
        // 显示合并后的IC序列
        if (this.chartData.ic_data_merged) {
          const merged = this.chartData.ic_data_merged
          const times = merged.ic_times || []
          const values = merged.ic_values || []
          
          if (times.length > 0 && values.length > 0) {
            const timeLabels = times.map(t => new Date(t).toLocaleString('zh-CN'))
            series.push({
              name: '合并IC序列',
              type: 'line',
              data: values,
              smooth: true,
              symbol: 'circle',
              symbolSize: 4
            })
            
            this.icTimeSeriesChart.setOption({
              title: { text: 'IC时序图', left: 'center' },
              tooltip: {
                trigger: 'axis',
                formatter: (params) => {
                  const param = params[0]
                  const timeIdx = param.dataIndex
                  return `${timeLabels[timeIdx]}<br/>${param.seriesName}: ${param.value.toFixed(4)}`
                }
              },
              grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                top: '10%'
              },
              xAxis: {
                type: 'category',
                data: timeLabels,
                axisLabel: {
                  rotate: 45,
                  fontSize: 10
                }
              },
              yAxis: {
                type: 'value',
                name: 'IC值'
              },
              series: series
            })
          } else {
            // 合并数据为空，显示空图表
            this.icTimeSeriesChart.setOption({
              title: { text: 'IC时序图', left: 'center' },
              xAxis: { type: 'category', data: [] },
              yAxis: { type: 'value', name: 'IC值' },
              series: []
            })
          }
        } else {
          // 合并数据不存在，显示空图表
          this.icTimeSeriesChart.setOption({
            title: { text: 'IC时序图', left: 'center' },
            xAxis: { type: 'category', data: [] },
            yAxis: { type: 'value', name: 'IC值' },
            series: []
          })
        }
      } else if (this.chartData.ic_data && this.chartData.ic_data.length > 0) {
        const timeLabelsMap = {}
        const allTimes = new Set()
        
        // 根据选中的symbol和timeframe过滤数据
        let filteredData = this.chartData.ic_data
        if (this.selectedSymbol.length > 0 || this.selectedTimeframe.length > 0) {
          filteredData = this.chartData.ic_data.filter(item => {
            const symbolMatch = this.selectedSymbol.length === 0 || this.selectedSymbol.includes(item.symbol)
            const timeframeMatch = this.selectedTimeframe.length === 0 || this.selectedTimeframe.includes(item.timeframe)
            return symbolMatch && timeframeMatch
          })
        }
        
        filteredData.forEach(item => {
          item.ic_times.forEach(t => allTimes.add(t))
        })
        const sortedTimes = Array.from(allTimes).sort()
        sortedTimes.forEach(t => {
          timeLabelsMap[t] = new Date(t).toLocaleString('zh-CN')
        })
        
        filteredData.forEach(item => {
          const times = item.ic_times || []
          const values = item.ic_values || []
          const name = `${item.symbol} ${item.timeframe}`
          
          const alignedValues = sortedTimes.map(t => {
            const idx = times.indexOf(t)
            return idx >= 0 && idx < values.length ? values[idx] : null
          })
          
          series.push({
            name: name,
            type: 'line',
            data: alignedValues,
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            connectNulls: false
          })
        })
        
        const timeLabels = sortedTimes.map(t => timeLabelsMap[t])
        
        this.icTimeSeriesChart.setOption({
          title: { text: 'IC时序图', left: 'center' },
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              let result = params[0].name + '<br/>'
              params.forEach(param => {
                if (param.value != null) {
                  result += `${param.seriesName}: ${param.value.toFixed(4)}<br/>`
                }
              })
              return result
            }
          },
          legend: {
            data: series.map(s => s.name),
            type: 'scroll',
            orient: 'vertical',
            right: 5,
            top: 50
          },
          grid: {
            left: '10%',
            right: '15%',
            bottom: '15%',
            top: '15%'
          },
          xAxis: {
            type: 'category',
            data: timeLabels,
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: 'IC值'
          },
          series: series
        })
      }
    },
    renderLayeredBacktestChart() {
      if (!this.$refs.layeredBacktestChartRef || !this.chartData) return
      
      const container = this.$refs.layeredBacktestChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderLayeredBacktestChart(), 100)
        return
      }
      
      this.destroyChart('layered-backtest')
      this.layeredBacktestChart = echarts.init(container)
      
      const quantileReturns = this.chartData.quantile_returns || {}
      const quantileKeys = Object.keys(quantileReturns).sort()
      const values = quantileKeys.map(key => (quantileReturns[key] || 0) * 100)
      this.layeredBacktestChart.setOption({
        title: { text: '分层回测图（分位数收益）', left: 'center' },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            return `${params[0].name}<br/>收益: ${params[0].value.toFixed(4)}%`
          }
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '10%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: quantileKeys,
          name: '分位数'
        },
        yAxis: {
          type: 'value',
          name: '收益(%)'
        },
        series: [{
          name: '分位数收益',
          type: 'bar',
          data: values,
          itemStyle: {
            color: (params) => {
              return params.value >= 0 ? '#67c23a' : '#f56c6c'
            }
          }
        }]
      })
    },
    renderICDistributionChart() {
      if (!this.$refs.icDistributionChartRef || !this.chartData) return
      
      const container = this.$refs.icDistributionChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderICDistributionChart(), 100)
        return
      }
      
      this.destroyChart('ic-distribution')
      this.icDistributionChart = echarts.init(container)
      
      let allICValues = []
      
      if (this.showMerged) {
        // 显示合并后的IC数据
        if (this.chartData.ic_data_merged) {
          allICValues = (this.chartData.ic_data_merged.ic_values || []).filter(v => v != null && !isNaN(v))
        }
      } else if (this.chartData.ic_data) {
        // 根据选中的symbol和timeframe过滤数据
        let filteredData = this.chartData.ic_data
        if (this.selectedSymbol.length > 0 || this.selectedTimeframe.length > 0) {
          filteredData = this.chartData.ic_data.filter(item => {
            const symbolMatch = this.selectedSymbol.length === 0 || this.selectedSymbol.includes(item.symbol)
            const timeframeMatch = this.selectedTimeframe.length === 0 || this.selectedTimeframe.includes(item.timeframe)
            return symbolMatch && timeframeMatch
          })
        }
        filteredData.forEach(item => {
          const values = (item.ic_values || []).filter(v => v != null && !isNaN(v))
          allICValues = allICValues.concat(values)
        })
      }
      
      if (allICValues.length === 0) return
      
      const min = Math.min(...allICValues)
      const max = Math.max(...allICValues)
      const binCount = 30
      const binWidth = (max - min) / binCount
      
      const bins = Array(binCount).fill(0)
      const binLabels = []
      
      for (let i = 0; i < binCount; i++) {
        binLabels.push((min + i * binWidth).toFixed(4))
      }
      
      allICValues.forEach(val => {
        const binIdx = Math.min(Math.floor((val - min) / binWidth), binCount - 1)
        bins[binIdx]++
      })
      
      this.icDistributionChart.setOption({
        title: { text: 'IC分布直方图', left: 'center' },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            return `${params[0].name}<br/>频数: ${params[0].value}`
          }
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '10%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: binLabels,
          name: 'IC值',
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '频数'
        },
        series: [{
          name: 'IC分布',
          type: 'bar',
          data: bins,
          itemStyle: {
            color: '#5470c6'
          }
        }]
      })
    },
    renderLongShortChart() {
      if (!this.$refs.longShortChartRef || !this.chartData) return
      
      const container = this.$refs.longShortChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderLongShortChart(), 100)
        return
      }
      
      this.destroyChart('longshort')
      this.longShortChart = echarts.init(container)
      
      const quantileReturns = this.chartData.quantile_returns || {}
      const returns = Object.values(quantileReturns)
      
      if (returns.length < 2) return
      
      const maxReturn = Math.max(...returns) * 100
      const minReturn = Math.min(...returns) * 100
      const longShortReturn = this.chartData.long_short_return || 0
      
      this.longShortChart.setOption({
        title: { text: '多空组合收益图', left: 'center' },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            return `${params[0].name}<br/>收益: ${params[0].value.toFixed(4)}%`
          }
        },
        grid: {
          left: '15%',
          right: '10%',
          bottom: '10%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: ['最高分位数', '最低分位数', '多空收益']
        },
        yAxis: {
          type: 'value',
          name: '收益(%)'
        },
        series: [{
          name: '收益',
          type: 'bar',
          data: [maxReturn, minReturn, longShortReturn * 100],
          itemStyle: {
            color: (params) => {
              const colors = ['#67c23a', '#f56c6c', '#409eff']
              return colors[params.dataIndex]
            }
          }
        }]
      })
    },
    renderMonthlyHeatmapChart() {
      if (!this.$refs.monthlyHeatmapChartRef || !this.chartData) return
      
      const container = this.$refs.monthlyHeatmapChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderMonthlyHeatmapChart(), 100)
        return
      }
      
      this.destroyChart('monthly-heatmap')
      this.monthlyHeatmapChart = echarts.init(container)
      
      let allTimes = []
      let allValues = []
      
      if (this.showMerged) {
        // 显示合并后的IC数据
        if (this.chartData.ic_data_merged) {
          allTimes = this.chartData.ic_data_merged.ic_times || []
          allValues = this.chartData.ic_data_merged.ic_values || []
        }
      } else if (this.chartData.ic_data) {
        // 根据选中的symbol和timeframe过滤数据
        let filteredData = this.chartData.ic_data
        if (this.selectedSymbol.length > 0 || this.selectedTimeframe.length > 0) {
          filteredData = this.chartData.ic_data.filter(item => {
            const symbolMatch = this.selectedSymbol.length === 0 || this.selectedSymbol.includes(item.symbol)
            const timeframeMatch = this.selectedTimeframe.length === 0 || this.selectedTimeframe.includes(item.timeframe)
            return symbolMatch && timeframeMatch
          })
        }
        filteredData.forEach(item => {
          allTimes = allTimes.concat(item.ic_times || [])
          allValues = allValues.concat(item.ic_values || [])
        })
      }
      
      if (allTimes.length === 0) return
      
      // 按天分组IC数据
      const dailyIC = {}
      for (let i = 0; i < allTimes.length; i++) {
        const time = allTimes[i]
        const value = allValues[i]
        if (value == null || isNaN(value)) continue
        
        const date = new Date(time)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const key = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        
        if (!dailyIC[key]) {
          dailyIC[key] = { sum: 0, count: 0 }
        }
        dailyIC[key].sum += value
        dailyIC[key].count++
      }
      
      const dailyAvg = {}
      Object.keys(dailyIC).forEach(key => {
        dailyAvg[key] = dailyIC[key].sum / dailyIC[key].count
      })
      
      // 收集所有年份-月份组合和日期
      const yearMonths = new Set()
      const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'))
      
      Object.keys(dailyAvg).forEach(key => {
        const parts = key.split('-')
        const yearMonth = `${parts[0]}-${parts[1]}`
        yearMonths.add(yearMonth)
      })
      
      const sortedYearMonths = Array.from(yearMonths).sort()
      
      const data = []
      sortedYearMonths.forEach((yearMonth, ymIdx) => {
        days.forEach((day, dIdx) => {
          const key = `${yearMonth}-${day}`
          const value = dailyAvg[key] || null
          if (value != null) {
            data.push([dIdx, ymIdx, value])
          }
        })
      })
      
      this.monthlyHeatmapChart.setOption({
        title: { text: '日度IC热力图', left: 'center' },
        tooltip: {
          position: 'top',
          formatter: (params) => {
            if (params.data && Array.isArray(params.data) && params.data.length >= 3) {
              const dIdx = params.data[0]
              const ymIdx = params.data[1]
              const value = params.data[2]
              const [year, month] = sortedYearMonths[ymIdx].split('-')
              return `${year}年${parseInt(month)}月${parseInt(days[dIdx])}日<br/>IC均值: ${value.toFixed(4)}`
            }
            return ''
          }
        },
        grid: {
          left: '15%',
          right: '10%',
          bottom: '15%',
          top: '15%'
        },
        xAxis: {
          type: 'category',
          data: days.map((d, idx) => {
            const dayNum = parseInt(d)
            // 每5天显示一次标签（第5、10、15、20、25、30日），以及第1日和第31日
            if (dayNum === 1 || dayNum % 5 === 0 || dayNum === 31) {
              return `${dayNum}日`
            }
            return ''
          }),
          splitArea: { show: true },
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'category',
          data: sortedYearMonths.map(ym => {
            const [year, month] = ym.split('-')
            return `${year}年${parseInt(month)}月`
          }),
          splitArea: { show: true }
        },
        visualMap: {
          min: Math.min(...Object.values(dailyAvg).filter(v => v != null)),
          max: Math.max(...Object.values(dailyAvg).filter(v => v != null)),
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          inRange: {
            color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
          }
        },
        series: [{
          name: '日度IC',
          type: 'heatmap',
          data: data,
          label: {
            show: false, // 按天显示时标签太多，隐藏标签
            fontSize: 8
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      })
    },
    renderAutocorrelationChart() {
      if (!this.$refs.autocorrelationChartRef || !this.chartData) return
      
      const container = this.$refs.autocorrelationChartRef
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => this.renderAutocorrelationChart(), 100)
        return
      }
      
      this.destroyChart('autocorrelation')
      this.autocorrelationChart = echarts.init(container)
      
      let allValues = []
      
      if (this.showMerged) {
        // 显示合并后的IC数据
        if (this.chartData.ic_data_merged) {
          allValues = (this.chartData.ic_data_merged.ic_values || []).filter(v => v != null && !isNaN(v))
        }
      } else if (this.chartData.ic_data) {
        // 根据选中的symbol和timeframe过滤数据
        let filteredData = this.chartData.ic_data
        if (this.selectedSymbol.length > 0 || this.selectedTimeframe.length > 0) {
          filteredData = this.chartData.ic_data.filter(item => {
            const symbolMatch = this.selectedSymbol.length === 0 || this.selectedSymbol.includes(item.symbol)
            const timeframeMatch = this.selectedTimeframe.length === 0 || this.selectedTimeframe.includes(item.timeframe)
            return symbolMatch && timeframeMatch
          })
        }
        filteredData.forEach(item => {
          const values = (item.ic_values || []).filter(v => v != null && !isNaN(v))
          allValues = allValues.concat(values)
        })
      }
      
      if (allValues.length < 2) return
      
      const maxLag = Math.min(50, Math.floor(allValues.length / 2))
      const autocorr = []
      const lags = []
      
      const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length
      const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length
      
      if (variance === 0) return
      
      for (let lag = 0; lag <= maxLag; lag++) {
        let covariance = 0
        for (let i = 0; i < allValues.length - lag; i++) {
          covariance += (allValues[i] - mean) * (allValues[i + lag] - mean)
        }
        covariance /= (allValues.length - lag)
        
        const corr = covariance / variance
        autocorr.push(corr)
        lags.push(lag)
      }
      
      this.autocorrelationChart.setOption({
        title: { text: '因子自相关图', left: 'center' },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            return `滞后${params[0].name}期<br/>自相关: ${params[0].value.toFixed(4)}`
          }
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '10%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: lags,
          name: '滞后期数'
        },
        yAxis: {
          type: 'value',
          name: '自相关系数'
        },
        series: [{
          name: '自相关',
          type: 'bar',
          data: autocorr,
          itemStyle: {
            color: '#5470c6'
          }
        }]
      })
    },
    destroyChart(type) {
      if (type === 'ic-timeseries' && this.icTimeSeriesChart) {
        this.icTimeSeriesChart.dispose()
        this.icTimeSeriesChart = null
      } else if (type === 'layered-backtest' && this.layeredBacktestChart) {
        this.layeredBacktestChart.dispose()
        this.layeredBacktestChart = null
      } else if (type === 'ic-distribution' && this.icDistributionChart) {
        this.icDistributionChart.dispose()
        this.icDistributionChart = null
      } else if (type === 'longshort' && this.longShortChart) {
        this.longShortChart.dispose()
        this.longShortChart = null
      } else if (type === 'monthly-heatmap' && this.monthlyHeatmapChart) {
        this.monthlyHeatmapChart.dispose()
        this.monthlyHeatmapChart = null
      } else if (type === 'autocorrelation' && this.autocorrelationChart) {
        this.autocorrelationChart.dispose()
        this.autocorrelationChart = null
      }
    },
    destroyAllCharts() {
      this.destroyChart('ic-timeseries')
      this.destroyChart('layered-backtest')
      this.destroyChart('ic-distribution')
      this.destroyChart('longshort')
      this.destroyChart('monthly-heatmap')
      this.destroyChart('autocorrelation')
    }
  }
}
</script>

<style scoped>
.factor-detail-charts {
  padding: 0;
}
</style>


