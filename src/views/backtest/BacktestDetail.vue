<template>
  <div class="backtest-detail-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="title">回测详情</div>
          <div class="meta">
            <el-tag :type="statusType(task.status)">{{ statusText(task.status) }}</el-tag>
            <span class="progress" v-if="task.status==='running'">{{ (task.progress*100).toFixed(0) }}%</span>
          </div>
        </div>
      </template>

      <el-descriptions :column="3" border class="mb12">
        <el-descriptions-item label="ID">{{ task.id }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ task.name }}</el-descriptions-item>
        <el-descriptions-item label="策略类">{{ task.strategy_class || task?.config?.strategy_class }}</el-descriptions-item>
        <el-descriptions-item label="周期">{{ task.start }} ~ {{ task.end }}</el-descriptions-item>
        <el-descriptions-item label="窗口">训练{{ task.train_days }}天｜测试{{ task.test_days }}天｜隔离{{ task.embargo_days||0 }}天</el-descriptions-item>
        <el-descriptions-item label="符号×周期">{{ (task.symbols||[]).join(',') }} × {{ (task.timeframes||[]).join(',') }}</el-descriptions-item>
      </el-descriptions>

      <el-row :gutter="12" class="mb12">
        <el-col :span="4"><MetricCard title="总收益率" :value="formatPercent(task.total_return)" :positive="(task.total_return||0) >= 0"/></el-col>
        <el-col :span="4"><MetricCard title="年化收益率" :value="formatPercent(task.annual_return)" :positive="(task.annual_return||0) >= 0"/></el-col>
        <el-col :span="4"><MetricCard title="最大回撤中位数" :value="formatPercent(task.mdd_median)" :positive="false"/></el-col>
        <el-col :span="4"><MetricCard title="Sharpe中位数" :value="formatNumber(task.sharpe_median,2)" :positive="(task.sharpe_median||0) >= 0"/></el-col>
        <el-col :span="4"><MetricCard title="总交易次数" :value="task.total_trades ?? '-'" :positive="true"/></el-col>
        <el-col :span="4"><MetricCard title="窗口胜率" :value="formatPercent(task.win_rate)" :positive="(task.win_rate||0) >= 0.5"/></el-col>
      </el-row>

      <el-row :gutter="12" class="mb12">
        <el-col :span="4"><MetricCard title="交易胜率" :value="formatPercent(task.trade_win_rate)" :positive="(task.trade_win_rate||0) >= 0.5"/></el-col>
        <el-col :span="4"><MetricCard title="换手率中位数" :value="formatNumber(task.turnover_median,2)" :positive="true"/></el-col>
        <el-col :span="4"><MetricCard title="窗口数" :value="task.windows_count ?? '-'" :positive="true"/></el-col>
        <el-col :span="12"></el-col>
      </el-row>

      <el-card class="mb12" shadow="hover">
        <template #header>
          <div class="title" style="display:flex;align-items:center;gap:12px;">
            <span>组合权益曲线（按窗口归一化均值）</span>
            <el-select v-model="selectedPair" size="small" style="width:220px" placeholder="选择标的×周期">
              <el-option label="全部组合" value="ALL" />
              <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
            </el-select>
            <span style="font-size:12px;color:#909399;">滚动窗口</span>
            <el-input-number v-model="rollingWindow" :min="5" :max="500" size="small" />
          </div>
        </template>
        <div ref="equityCurveRef" style="height:360px;"></div>
      </el-card>

      <el-card class="mb12" shadow="hover">
        <template #header>
          <div class="title" style="display:flex;align-items:center;gap:12px;">
            <span>窗口样例权益曲线</span>
            <el-select v-model="selectedPair" size="small" style="width:220px" placeholder="选择标的×周期">
              <el-option label="全部组合" value="ALL" />
              <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
            </el-select>
            <el-select v-model="selectedWindowIndex" size="small" style="width:260px" placeholder="选择窗口">
              <el-option v-for="(opt,idx) in windowOptions" :key="idx" :label="opt.label" :value="opt.index" />
            </el-select>
            <el-checkbox v-model="sampleOverlayCombined" label="叠加组合线" size="small" />
          </div>
        </template>
        <div ref="windowSampleRef" style="height:320px;"></div>
      </el-card>

      <el-card class="mb12" shadow="hover">
        <template #header>
          <div class="title" style="display:flex;align-items:center;gap:12px;">
            <span>权益曲线对比（多组）</span>
            <el-select v-model="selectedPairs" multiple collapse-tags size="small" style="min-width:280px" placeholder="选择多个标的×周期">
              <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
            </el-select>
            <el-checkbox v-model="showAllCombined" label="显示组合线" size="small" />
          </div>
        </template>
        <div ref="equityCompareRef" style="height:360px;"></div>
      </el-card>

      <el-row :gutter="12" class="mb12">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">滚动 Sharpe</div></template>
            <div ref="rollingSharpeRef" style="height:280px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">滚动回撤</div></template>
            <div ref="rollingDdRef" style="height:280px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="12" class="mb12">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">滚动年化收益</div></template>
            <div ref="rollingAnnRef" style="height:280px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">滚动波动率</div></template>
            <div ref="rollingVolRef" style="height:280px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="mb12" shadow="hover">
        <template #header><div class="title">滚动 Calmar（年化/绝对回撤）</div></template>
        <div ref="rollingCalmarRef" style="height:280px;"></div>
      </el-card>

      <el-card class="mb12" shadow="hover">
        <template #header>
          <div class="title">结论</div>
        </template>
        <div class="conclusion">
          <p><b>总体结论：</b>{{ overallConclusion }}</p>
          <ul>
            <li>通过窗口阈值的标的×周期：{{ passPairs }}/{{ totalPairs }}</li>
            <li>Sharpe 中位数：{{ formatNumber(task.sharpe_median,2) }}；最大回撤中位数：{{ formatPercent(task.mdd_median) }}；胜率：{{ formatPercent(task.win_rate) }}</li>
            <li>总交易次数：{{ task.total_trades ?? '-' }}；换手率中位数：{{ formatNumber(task.turnover_median,2) }}</li>
          </ul>
        </div>
      </el-card>

      <el-row :gutter="12" class="mb12">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">Sharpe 分布</div></template>
            <div ref="sharpeHistRef" style="height:320px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">Sharpe vs MDD（窗口散点）</div></template>
            <div ref="scatterRef" style="height:320px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="mb12" shadow="hover">
        <template #header><div class="title">标的×周期表现（Sharpe中位数）</div></template>
        <div ref="pairBarRef" style="height:360px;"></div>
      </el-card>

      <el-row :gutter="12" class="mb12">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">交易次数分布（窗口级）</div></template>
            <div ref="tradesHistRef" style="height:280px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><div class="title">窗口PnL分布</div></template>
            <div ref="pnlHistRef" style="height:280px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="mb12" shadow="hover">
        <template #header><div class="title">标的×周期交易胜率</div></template>
        <div ref="pairTradeBarRef" style="height:360px;"></div>
      </el-card>

      <el-card class="mb12" shadow="hover">
        <template #header><div class="title">训练评分 vs 测试 Sharpe（仅启用寻优时）</div></template>
        <div ref="trainVsTestRef" style="height:320px;"></div>
      </el-card>

      <el-card class="mb12" shadow="hover" v-if="paramNames.length > 0">
        <template #header><div class="title">参数稳健性（各窗口最佳参数分布）</div></template>
        <el-row :gutter="12">
          <el-col :span="8" v-for="p in paramNames" :key="p">
            <div class="param-chart-title">{{ p }}</div>
            <div :ref="el => setParamRef(p, el)" style="height:260px;"></div>
          </el-col>
        </el-row>
      </el-card>

      <el-tabs v-model="active">
        <el-tab-pane label="摘要" name="summary">
          <pre class="json-pre">{{ pretty(task.summary) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="窗口明细" name="windows">
          <el-table :data="task.windows || []" style="width:100%" size="small" border>
            <el-table-column label="符号" prop="symbol" width="120"/>
            <el-table-column label="周期" prop="timeframe" width="120"/>
            <el-table-column label="训练" width="240">
              <template #default="s">{{ (s.row.train||[]).join(' ~ ') }}</template>
            </el-table-column>
            <el-table-column label="测试" width="240">
              <template #default="s">{{ (s.row.test||[]).join(' ~ ') }}</template>
            </el-table-column>
            <el-table-column label="参数">
              <template #default="s">{{ pretty(s.row.params) }}</template>
            </el-table-column>
            <el-table-column label="Sharpe" prop="test_sharpe" width="100"/>
            <el-table-column label="MDD" prop="test_mdd" width="100"/>
            <el-table-column label="交易" prop="test_trades" width="80"/>
            <el-table-column label="换手" prop="test_turnover" width="100"/>
            <el-table-column label="PnL" prop="test_pnl" width="120"/>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import { getBacktestTask, getBacktestRecord } from '@/api/backtest'
import * as echarts from 'echarts'

const MetricCard = {
  name: 'MetricCard',
  props: { title: String, value: [String, Number], positive: Boolean },
  template: `
    <el-card shadow="never" class="metric-card">
      <div class="metric-title">{{ title }}</div>
      <div class="metric-value" :class="{pos: positive, neg: !positive}">{{ value ?? '-' }}</div>
    </el-card>
  `
}

export default {
  name: 'BacktestDetail',
  components: { MetricCard },
  data() {
    return { task: {}, active: 'summary', loading: false, sharpeHistRef: null, scatterRef: null, pairBarRef: null, tradesHistRef: null, pnlHistRef: null, pairTradeBarRef: null, trainVsTestRef: null, equityCurveRef: null, windowSampleRef: null, equityCompareRef: null, rollingSharpeRef: null, rollingDdRef: null, rollingAnnRef: null, rollingVolRef: null, rollingCalmarRef: null, selectedPair: 'ALL', selectedPairs: [], selectedWindowIndex: 0, sampleOverlayCombined: true, showAllCombined: true, rollingWindow: 50, paramChartRefs: {} }
  },
  computed: {
    paramNames() {
      try {
        const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
        const set = new Set()
        ws.forEach(w => Object.keys(w?.params || {}).forEach(k => set.add(String(k))))
        return Array.from(set)
      } catch (e) {
        return []
      }
    },
    windowOptions() {
      try {
        const wins = this.windowListByPair(this.selectedPair)
        return wins.map((w, idx) => ({
          index: idx,
          label: `${w.symbol}|${w.timeframe} ${(w.test || []).join(' ~ ')}`
        }))
      } catch (e) {
        return []
      }
    }
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const id = this.$route.params.id
        const { data } = await getBacktestRecord(id)
        this.task = data || {}
        this.$nextTick(() => this.renderCharts())
      } finally {
        this.loading = false
      }
    },
    renderCharts() {
      try {
        this.renderSharpeHist()
        this.renderScatter()
        this.renderPairBar()
        this.renderTradesHist()
        this.renderPnlHist()
        this.renderPairTradeBar()
        this.renderEquityCurve()
        this.renderWindowSample()
        this.renderEquityCompare()
        this.renderRollingCharts()
        this.renderTrainVsTest()
        this.renderParamCharts()
      } catch (e) { /* ignore */ }
    },
    windowListByPair(pairKey = 'ALL') {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const filtered = ws.filter(w => {
        if (pairKey === 'ALL') return true
        const key = `${w.symbol}|${w.timeframe}`
        return key === pairKey
      })
      return filtered.filter(w => Array.isArray(w.equity_times) && Array.isArray(w.equity_values) && w.equity_times.length === w.equity_values.length && w.equity_times.length > 1)
    },
    buildWindowSeries(win) {
      const times = win?.equity_times || []
      const vals = win?.equity_values || []
      if (!times.length || times.length !== vals.length) return []
      const base = Number(vals[0] || 0)
      if (!Number.isFinite(base) || base === 0) return []
      const pts = []
      for (let i=0;i<times.length;i++) {
        const t = Number(times[i])
        const v = Number(vals[i]) / base
        if (Number.isFinite(t) && Number.isFinite(v)) pts.push([t, v])
      }
      return pts
    },
    renderWindowSample() {
      const el = this.$refs.windowSampleRef
      if (!el) return
      const chart = echarts.init(el)
      const wins = this.windowListByPair(this.selectedPair)
      if (!wins.length) { chart.clear(); return }
      const idx = Math.min(Math.max(0, this.selectedWindowIndex || 0), wins.length - 1)
      const target = wins[idx]
      const series = []
      const pts = this.buildWindowSeries(target)
      series.push({ name: `样例-${idx+1}`, type:'line', showSymbol:false, smooth:true, data: pts })
      if (this.sampleOverlayCombined) {
        const key = this.selectedPair
        const overlay = this.buildCombinedSeries(key)
        series.push({ name: '组合', type:'line', showSymbol:false, smooth:true, data: overlay, lineStyle:{ type:'dashed' } })
      }
      chart.setOption({
        tooltip: { trigger:'axis' },
        legend: { top: 4 },
        xAxis: { type:'time' },
        yAxis: { type:'value', name:'归一化净值' },
        series
      })
    },
    buildCombinedSeries(pairKey = 'ALL') {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const filtered = ws.filter(w => {
        if (pairKey === 'ALL') return true
        const key = `${w.symbol}|${w.timeframe}`
        return key === pairKey
      })
      const timeToVals = new Map()
      filtered.forEach(w => {
        const times = Array.isArray(w.equity_times) ? w.equity_times : []
        const vals = Array.isArray(w.equity_values) ? w.equity_values : []
        if (!times.length || times.length !== vals.length) return
        const base = Number(vals[0] || 0)
        if (!Number.isFinite(base) || base === 0) return
        for (let i = 0; i < times.length; i++) {
          const t = Number(times[i])
          const v = Number(vals[i]) / base
          if (!Number.isFinite(t) || !Number.isFinite(v)) continue
          if (!timeToVals.has(t)) timeToVals.set(t, [])
          timeToVals.get(t).push(v)
        }
      })
      const points = Array.from(timeToVals.entries()).sort((a,b)=>a[0]-b[0]).map(([t, arr]) => [t, arr.reduce((s,x)=>s+x,0)/arr.length])
      return points
    },
    renderEquityCurve() {
      const pts = this.buildCombinedSeries(this.selectedPair)
      const el = this.$refs.equityCurveRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: { trigger:'axis', valueFormatter: v=>this.formatNumber(v,4) },
        xAxis: { type:'time' },
        yAxis: { type:'value', name:'归一化净值' },
        series: [{ type:'line', showSymbol:false, smooth:true, data: pts }]
      })
    },
    renderEquityCompare() {
      const el = this.$refs.equityCompareRef
      if (!el) return
      const chart = echarts.init(el)
      const series = []
      const legend = []
      if (this.showAllCombined) {
        const ptsAll = this.buildCombinedSeries('ALL')
        series.push({ name: 'ALL', type:'line', showSymbol:false, smooth:true, data: ptsAll })
        legend.push('ALL')
      }
      const colors = ['#5470C6','#91CC75','#EE6666','#73C0DE','#FAC858','#3BA272','#FC8452','#9A60B4','#ea7ccc']
      this.selectedPairs.forEach((k, idx) => {
        const pts = this.buildCombinedSeries(k)
        series.push({ name: k, type:'line', showSymbol:false, smooth:true, data: pts, lineStyle:{ width:2 }, itemStyle:{ color: colors[idx % colors.length] } })
        legend.push(k)
      })
      chart.setOption({
        tooltip: { trigger:'axis' },
        legend: { data: legend, top: 4 },
        xAxis: { type:'time' },
        yAxis: { type:'value', name:'归一化净值' },
        series
      })
    },
    computeReturnsFromCurve(points) {
      const ret = []
      for (let i=1;i<points.length;i++) {
        const p0 = points[i-1][1]
        const p1 = points[i][1]
        ret.push(p0 ? (p1/p0 - 1) : 0)
      }
      return ret
    },
    computeRollingSharpe(returns, window) {
      const out = new Array(returns.length).fill(null)
      for (let i=window-1; i<returns.length; i++) {
        const slice = returns.slice(i-window+1, i+1)
        const mean = slice.reduce((s,x)=>s+x,0)/slice.length
        const variance = slice.reduce((s,x)=>s + Math.pow(x-mean,2), 0) / (slice.length-1 || 1)
        const std = Math.sqrt(Math.max(variance, 0))
        out[i] = std > 0 ? (mean / std) * Math.sqrt(252) : 0
      }
      return out
    },
    computeDrawdown(points) {
      const out = []
      let peak = -Infinity
      for (let i=0;i<points.length;i++) {
        peak = Math.max(peak, points[i][1])
        const dd = peak ? (points[i][1] - peak) / peak : 0
        out.push(dd)
      }
      return out
    },
    renderRollingCharts() {
      const pts = this.buildCombinedSeries(this.selectedPair)
      if (!pts.length) return
      const rets = this.computeReturnsFromCurve(pts)
      const sharpe = this.computeRollingSharpe(rets, Math.max(5, this.rollingWindow))
      const dd = this.computeDrawdown(pts)
      const times = pts.map(p=>p[0]).slice(1)
      const sharpePairs = sharpe.map((v,i)=>[times[i]||times[0], v])
      const ddPairs = dd.map((v,i)=>[pts[i][0], v])
      const el1 = this.$refs.rollingSharpeRef
      if (el1) {
        const c1 = echarts.init(el1)
        c1.setOption({ xAxis:{ type:'time' }, yAxis:{ type:'value', name:'Sharpe' }, series:[{ type:'line', showSymbol:false, data: sharpePairs }] })
      }
      const el2 = this.$refs.rollingDdRef
      if (el2) {
        const c2 = echarts.init(el2)
        c2.setOption({ xAxis:{ type:'time' }, yAxis:{ type:'value', name:'回撤', axisLabel:{ formatter:v=>`${(v*100).toFixed(0)}%`} }, series:[{ type:'line', showSymbol:false, areaStyle:{}, data: ddPairs }] })
      }
      // rolling annualized return (compounded)
      const window = Math.max(5, this.rollingWindow)
      const ann = []
      for (let i = window-1; i < rets.length; i++) {
        const slice = rets.slice(i-window+1, i+1)
        const compounded = slice.reduce((acc, r) => acc * (1 + r), 1) - 1
        const annualized = Math.pow(1 + compounded, 252 / slice.length) - 1
        ann[i] = annualized
      }
      const annPairs = ann.map((v,i)=>[times[i]||times[0], v])
      const el3 = this.$refs.rollingAnnRef
      if (el3) {
        const c3 = echarts.init(el3)
        c3.setOption({ xAxis:{ type:'time' }, yAxis:{ type:'value', name:'年化', axisLabel:{ formatter:v=>`${(v*100).toFixed(0)}%`} }, series:[{ type:'line', showSymbol:false, data: annPairs }] })
      }
      // rolling volatility (std * sqrt(252))
      const vol = []
      for (let i = window-1; i < rets.length; i++) {
        const slice = rets.slice(i-window+1, i+1)
        const mean = slice.reduce((s,x)=>s+x,0)/slice.length
        const variance = slice.reduce((s,x)=>s + Math.pow(x-mean,2), 0) / (slice.length-1 || 1)
        vol[i] = Math.sqrt(Math.max(variance, 0)) * Math.sqrt(252)
      }
      const volPairs = vol.map((v,i)=>[times[i]||times[0], v])
      const el4 = this.$refs.rollingVolRef
      if (el4) {
        const c4 = echarts.init(el4)
        c4.setOption({ xAxis:{ type:'time' }, yAxis:{ type:'value', name:'波动率' }, series:[{ type:'line', showSymbol:false, data: volPairs }] })
      }
      // rolling calmar (annualized / |min drawdown over window|)
      const calmar = []
      const ddAbsMin = []
      // compute rolling min drawdown over window on normalized curve
      const normVals = pts.map(p => p[1])
      for (let i = window-1; i < normVals.length; i++) {
        const seg = normVals.slice(i-window+1, i+1)
        let peak = -Infinity
        let minDD = 0
        for (let j = 0; j < seg.length; j++) {
          peak = Math.max(peak, seg[j])
          const ddv = peak ? (seg[j] - peak) / peak : 0
          if (ddv < minDD) minDD = ddv
        }
        ddAbsMin[i] = Math.abs(minDD)
        const a = ann[i] || 0
        calmar[i] = ddAbsMin[i] > 0 ? a / ddAbsMin[i] : 0
      }
      const calmarPairs = calmar.map((v,i)=>[pts[i+1]?.[0] || pts[i]?.[0], v])
      const el5 = this.$refs.rollingCalmarRef
      if (el5) {
        const c5 = echarts.init(el5)
        c5.setOption({ xAxis:{ type:'time' }, yAxis:{ type:'value', name:'Calmar' }, series:[{ type:'line', showSymbol:false, data: calmarPairs }] })
      }
    },
    collectWindowArrays() {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const sharpe = ws.map(w => Number(w.test_sharpe)).filter(v => Number.isFinite(v))
      const mdd = ws.map(w => Number(w.test_mdd)).filter(v => Number.isFinite(v))
      const pnl = ws.map(w => Number(w.test_pnl)).filter(v => Number.isFinite(v))
      const trades = ws.map(w => Number(w.test_trades)).filter(v => Number.isFinite(v))
      const train = ws.map(w => Number(w.train_score)).filter(v => Number.isFinite(v))
      return { sharpe, mdd, pnl, trades, train, ws }
    },
    renderSharpeHist() {
      const { sharpe } = this.collectWindowArrays()
      const bins = [-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,3]
      const counts = new Array(bins.length-1).fill(0)
      sharpe.forEach(v => {
        for (let i=0;i<bins.length-1;i++) if (v>=bins[i] && v<bins[i+1]) { counts[i]++; break }
      })
      const el = this.$refs.sharpeHistRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: {},
        xAxis: { type: 'category', data: counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`), axisLabel:{ rotate:45 } },
        yAxis: { type: 'value' },
        series: [{ type:'bar', data: counts }]
      })
    },
    renderScatter() {
      const { sharpe, mdd, trades } = this.collectWindowArrays()
      const data = sharpe.map((s,i)=>[mdd[i]??0, s, trades[i]??0])
      const el = this.$refs.scatterRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: { trigger:'item', formatter: p=>`MDD: ${this.formatPercent(p.data[0])}<br/>Sharpe: ${this.formatNumber(p.data[1],2)}<br/>Trades: ${p.data[2]}` },
        xAxis: { type:'value', name:'MDD', axisLabel:{ formatter: v=>`${(v*100).toFixed(0)}%` } },
        yAxis: { type:'value', name:'Sharpe' },
        series: [{ type:'scatter', symbolSize: d => 6 + Math.min(20, d[2]||0), data }]
      })
    },
    renderPairBar() {
      const sm = this.task?.summary || {}
      const entries = Object.entries(sm)
      const names = entries.map(([k])=>k)
      const values = entries.map(([_,v])=>Number(v.sharpe_median||0))
      const el = this.$refs.pairBarRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: {},
        grid:{ left: 80, right: 20, top: 20, bottom: 60 },
        xAxis: { type:'category', data: names, axisLabel:{ rotate:45 } },
        yAxis: { type:'value', name:'Sharpe中位数' },
        series: [{ type:'bar', data: values }]
      })
    },
    renderPairTradeBar() {
      const sm = this.task?.summary || {}
      const entries = Object.entries(sm)
      const names = entries.map(([k])=>k)
      const values = entries.map(([_,v])=>{
        const x = Number(v.trade_win_rate)
        return Number.isFinite(x) ? x : 0
      })
      const el = this.$refs.pairTradeBarRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: { formatter: p=>`${p.name}<br/>交易胜率：${this.formatPercent(p.data)}` },
        grid:{ left: 80, right: 20, top: 20, bottom: 60 },
        xAxis: { type:'category', data: names, axisLabel:{ rotate:45 } },
        yAxis: { type:'value', name:'交易胜率', axisLabel:{ formatter: v=>`${(v*100).toFixed(0)}%` } },
        series: [{ type:'bar', data: values }]
      })
    },
    renderTradesHist() {
      const { trades } = this.collectWindowArrays()
      if (!trades.length) return
      const bins = [0,1,2,3,5,8,13,21]
      const counts = new Array(bins.length-1).fill(0)
      trades.forEach(v => {
        for (let i=0;i<bins.length-1;i++) if (v>=bins[i] && v<bins[i+1]) { counts[i]++; break }
      })
      const el = this.$refs.tradesHistRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: {},
        xAxis: { type:'category', data: counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`) },
        yAxis: { type:'value' },
        series: [{ type:'bar', data: counts }]
      })
    },
    renderPnlHist() {
      const { pnl } = this.collectWindowArrays()
      if (!pnl.length) return
      const bins = [-5000,-2000,-1000,-500,-100,0,100,500,1000,2000,5000]
      const counts = new Array(bins.length-1).fill(0)
      pnl.forEach(v => {
        for (let i=0;i<bins.length-1;i++) if (v>=bins[i] && v<bins[i+1]) { counts[i]++; break }
      })
      const el = this.$refs.pnlHistRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: {},
        xAxis: { type:'category', data: counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`) },
        yAxis: { type:'value' },
        series: [{ type:'bar', data: counts }]
      })
    },
    renderTrainVsTest() {
      const { train, sharpe } = this.collectWindowArrays()
      if (!train.length || !sharpe.length) return
      const data = train.map((t,i)=>[t, sharpe[i] ?? null]).filter(d => d[1] !== null)
      const el = this.$refs.trainVsTestRef
      if (!el) return
      const chart = echarts.init(el)
      chart.setOption({
        tooltip: { trigger:'item', formatter: p=>`训练评分: ${this.formatNumber(p.data[0],2)}<br/>测试Sharpe: ${this.formatNumber(p.data[1],2)}` },
        xAxis: { type:'value', name:'训练评分' },
        yAxis: { type:'value', name:'测试Sharpe' },
        series: [{ type:'scatter', symbolSize: 8, data }]
      })
    },
    setParamRef(name, el) { if (el) this.paramChartRefs[name] = el },
    renderParamCharts() {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      if (!ws.length) return
      const dist = {}
      ws.forEach(w => {
        const p = w.params || {}
        Object.entries(p).forEach(([k,v]) => {
          const key = String(k)
          const val = Array.isArray(v) ? v.join(',') : String(v)
          dist[key] = dist[key] || {}
          dist[key][val] = (dist[key][val] || 0) + 1
        })
      })
      Object.entries(dist).forEach(([name, counts]) => {
        const el = this.paramChartRefs[name]
        if (!el) return
        const chart = echarts.init(el)
        const labels = Object.keys(counts)
        const values = labels.map(l => counts[l])
        chart.setOption({
          tooltip: {},
          xAxis: { type:'category', data: labels, axisLabel:{ rotate:45 } },
          yAxis: { type:'value', name:'出现次数' },
          series: [{ type:'bar', data: values }]
        })
      })
    },
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null) return '-'
      return Number(num).toFixed(decimals).replace(/\.?0+$/, '')
    },
    formatPercent(v) {
      if (v === undefined || v === null) return '-'
      return (Number(v) * 100).toFixed(2) + '%'
    },
    pretty(obj) { try { return JSON.stringify(obj || {}, null, 2) } catch { return '-' } },
    statusType(s) { return { running: 'warning', completed: 'success', failed: 'danger' }[s] || 'info' },
    statusText(s) { return { pending: '排队中', running: '运行中', completed: '已完成', failed: '失败' }[s] || s }
  },
  watch: {
    '$route.params.id'() {
      // 路由参数变化时，重新加载，避免展示上一个详情
      this.task = {}
      this.$nextTick(() => this.load())
    },
    selectedPair() {
      this.$nextTick(() => {
        this.renderEquityCurve()
        this.renderWindowSample()
        this.renderRollingCharts()
        this.renderEquityCompare()
      })
    },
    rollingWindow() {
      this.$nextTick(() => {
        this.renderRollingCharts()
      })
    },
    selectedWindowIndex() {
      this.$nextTick(() => { this.renderWindowSample() })
    },
    sampleOverlayCombined() {
      this.$nextTick(() => { this.renderWindowSample() })
    }
  },
  created() { this.load() }
}
</script>

<style scoped>
.backtest-detail-page { padding: 20px; }
.header-bar { display:flex; justify-content: space-between; align-items:center; }
.header-bar .title { font-weight: 600; font-size: 16px; }
.metric-card { text-align: center; }
.metric-title { color:#909399; font-size: 12px; }
.metric-value { font-size: 20px; font-weight: 600; }
.metric-value.pos { color:#67c23a; }
.metric-value.neg { color:#f56c6c; }
.mb12 { margin-bottom: 12px; }
.json-pre { background:#f7f7f7; padding:12px; border-radius:6px; max-height:420px; overflow:auto; }
.conclusion ul { margin:0; padding-left: 18px; }
.param-chart-title { font-size: 12px; color:#909399; margin-bottom: 6px; }
</style>


