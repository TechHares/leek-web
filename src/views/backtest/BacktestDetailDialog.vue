<template>
  <el-dialog v-model="visibleInner" :title="`回测结果 #${task?.id || ''}`" width="90%" top="4vh" destroy-on-close :before-close="onClose">
    <div v-loading="loading">
      <el-tabs v-model="active">
        <el-tab-pane label="概览" name="overview">
          <el-descriptions :column="3" border class="mb12">
            <el-descriptions-item label="ID">{{ task.id }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ task.name }}</el-descriptions-item>
            <el-descriptions-item label="周期">{{ task.start }} ~ {{ task.end }}</el-descriptions-item>
            <el-descriptions-item label="窗口">训练{{ task.train_days }}天｜测试{{ task.test_days }}天｜隔离{{ task.embargo_days||0 }}天</el-descriptions-item>
            <el-descriptions-item label="标的×周期">{{ (task.symbols||[]).join(',') }} × {{ (task.timeframes||[]).join(',') }}</el-descriptions-item>
            <el-descriptions-item label="状态"><el-tag :type="statusType(task.status)">{{ statusText(task.status) }}</el-tag></el-descriptions-item>
          </el-descriptions>

          <el-descriptions :column="4" border class="mb12">
            <el-descriptions-item label="总收益率">{{ formatPercent(task.total_return) }}</el-descriptions-item>
            <el-descriptions-item label="年化收益率">{{ formatPercent(task.annual_return) }}</el-descriptions-item>
            <el-descriptions-item label="Sharpe中位数">{{ formatNumber(task.sharpe_median,2) }}</el-descriptions-item>
            <el-descriptions-item label="最大回撤中位数">{{ formatPercent(task.mdd_median) }}</el-descriptions-item>
            <el-descriptions-item label="窗口胜率">{{ formatPercent(task.win_rate) }}</el-descriptions-item>
            <el-descriptions-item label="交易胜率">{{ formatPercent(extra.tradeWinRate) }}</el-descriptions-item>
            <el-descriptions-item label="总交易次数">{{ task.total_trades ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="窗口数">{{ extra.windowsCount ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="窗口盈利率">{{ formatPercent(extra.positiveWindowRate) }}</el-descriptions-item>
            <el-descriptions-item label="换手率中位数">{{ formatNumber(extra.turnoverMedian,2) }}</el-descriptions-item>
            <el-descriptions-item label="组合最大回撤">{{ formatPercent(extra.combinedMdd) }}</el-descriptions-item>
            <el-descriptions-item label="组合Sharpe">{{ formatNumber(extra.combinedSharpe,2) }}</el-descriptions-item>
            <el-descriptions-item label="组合Calmar">{{ formatNumber(extra.calmar,2) }}</el-descriptions-item>
            <el-descriptions-item label="平均盈利">{{ task.profit_sum!=null && task.profit_count>0 ? `${formatNumber(task.profit_sum,2)} / ${task.profit_count} = ${formatNumber(task.avg_win|| (extra.avgWin||0),2)}` : (task.avg_win!=null ? formatNumber(task.avg_win,2) : (extra.avgWin!=null ? formatNumber(extra.avgWin,2) : '-')) }}</el-descriptions-item>
            <el-descriptions-item label="平均亏损">{{ task.loss_sum!=null && task.loss_count>0 ? `${formatNumber(task.loss_sum,2)} / ${task.loss_count} = ${formatNumber(task.avg_loss|| (extra.avgLoss||0),2)}` : (task.avg_loss!=null ? formatNumber(task.avg_loss,2) : (extra.avgLoss!=null ? formatNumber(extra.avgLoss,2) : '-')) }}</el-descriptions-item>
            <el-descriptions-item label="盈亏比(PF)">{{ task.profit_factor!=null ? formatNumber(task.profit_factor,2) : (extra.profitFactor!=null ? formatNumber(extra.profitFactor,2) : '-') }}</el-descriptions-item>
            <el-descriptions-item label="平均盈亏比">{{ task.win_loss_ratio!=null ? formatNumber(task.win_loss_ratio,2) : (extra.winLossRatio!=null ? formatNumber(extra.winLossRatio,2) : '-') }}</el-descriptions-item>
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
            <el-col :span="4"><MetricCard title="交易胜率" :value="formatPercent(extra.tradeWinRate)" :positive="(extra.tradeWinRate||0) >= 0.5"/></el-col>
            <el-col :span="4"><MetricCard title="窗口数" :value="extra.windowsCount" :positive="true"/></el-col>
            <el-col :span="4"><MetricCard title="窗口盈利率" :value="formatPercent(extra.positiveWindowRate)" :positive="(extra.positiveWindowRate||0) >= 0.5"/></el-col>
            <el-col :span="4"><MetricCard title="交易次数中位数" :value="extra.tradesMedian ?? '-'" :positive="true"/></el-col>
            <el-col :span="4"><MetricCard title="组合最大回撤" :value="formatPercent(extra.combinedMdd)" :positive="false"/></el-col>
            <el-col :span="4"><MetricCard title="组合Calmar" :value="formatNumber(extra.calmar,2)" :positive="(extra.calmar||0) >= 1"/></el-col>
          </el-row>

          <el-row :gutter="12" class="mb12">
            <el-col :span="4"><MetricCard title="组合波动率" :value="formatPercent(extra.combinedVol)" :positive="false"/></el-col>
            <el-col :span="4"><MetricCard title="组合Sharpe" :value="formatNumber(extra.combinedSharpe,2)" :positive="(extra.combinedSharpe||0) >= 0"/></el-col>
            <el-col :span="4"><MetricCard title="换手率中位数" :value="formatNumber(extra.turnoverMedian,2)" :positive="true"/></el-col>
            <el-col :span="4"><MetricCard title="最佳窗口Sharpe" :value="formatNumber(extra.bestSharpe,2)" :positive="(extra.bestSharpe||0) >= 0"/></el-col>
            <el-col :span="4"><MetricCard title="最差窗口Sharpe" :value="formatNumber(extra.worstSharpe,2)" :positive="false"/></el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="曲线" name="curves">
          <div class="toolbar mb8">
            <el-select v-model="selectedPair" size="small" style="width:220px" placeholder="选择标的×周期">
              <el-option label="全部组合" value="ALL" />
              <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
            </el-select>
            <span style="margin-left:12px;font-size:12px;color:#909399;">滚动窗口</span>
            <el-input-number v-model="rollingWindow" :min="5" :max="500" size="small" />
            <el-divider direction="vertical" />
            <el-select v-model="selectedPairs" multiple collapse-tags size="small" style="min-width:260px" placeholder="对比组合(多选)">
              <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
            </el-select>
            <el-checkbox v-model="showAllCombined" label="显示组合线" size="small" />
          </div>
          <el-row :gutter="12" class="mb12">
            <el-col :span="24">
              <el-card shadow="hover"><div ref="equityCurveRef" style="height:320px;"></div></el-card>
            </el-col>
          </el-row>
          <el-row :gutter="12" class="mb12">
            <el-col :span="24"><el-card shadow="hover"><div ref="equityCompareRef" style="height:300px;"></div></el-card></el-col>
          </el-row>
          <el-row :gutter="12" class="mb12">
            <el-col :span="24">
              <el-card shadow="hover">
                <div class="toolbar mb8">
                  <el-select v-model="selectedPair" size="small" style="width:220px" placeholder="样例组合">
                    <el-option label="全部组合" value="ALL" />
                    <el-option v-for="(v,k) in task.summary || {}" :key="k" :label="k" :value="k" />
                  </el-select>
                  <el-select v-model="selectedWindowIndex" size="small" style="width:260px" placeholder="选择窗口">
                    <el-option v-for="opt in windowOptions" :key="opt.index" :label="opt.label" :value="opt.index" />
                  </el-select>
                  <el-checkbox v-model="sampleOverlayCombined" label="叠加组合线" size="small" />
                </div>
                <div ref="windowSampleRef" style="height:260px;"></div>
              </el-card>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12"><el-card shadow="hover"><div ref="rollingSharpeRef" style="height:260px;"></div></el-card></el-col>
            <el-col :span="12"><el-card shadow="hover"><div ref="rollingDdRef" style="height:260px;"></div></el-card></el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="分布" name="dist">
          <el-row :gutter="12" class="mb12">
            <el-col :span="12"><el-card shadow="hover"><div ref="sharpeHistRef" style="height:260px;"></div></el-card></el-col>
            <el-col :span="12"><el-card shadow="hover"><div ref="scatterRef" style="height:260px;"></div></el-card></el-col>
          </el-row>
          <el-row :gutter="12" class="mb12">
            <el-col :span="12"><el-card shadow="hover"><div ref="tradesHistRef" style="height:240px;"></div></el-card></el-col>
            <el-col :span="12"><el-card shadow="hover"><div ref="pnlHistRef" style="height:240px;"></div></el-card></el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="24"><el-card shadow="hover"><div ref="pairBarRef" style="height:260px;"></div></el-card></el-col>
            <el-col :span="24" style="margin-top:12px;"><el-card shadow="hover"><div ref="pairTradeBarRef" style="height:260px;"></div></el-card></el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="参数" name="params" v-if="paramNames.length > 0">
          <el-row :gutter="12">
            <el-col :span="8" v-for="p in paramNames" :key="p">
              <div class="param-chart-title">{{ p }}</div>
              <div :ref="el => setParamRef(p, el)" style="height:260px;"></div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="窗口" name="windows">
          <el-table :data="task.windows || []" style="width:100%" size="small" border>
            <el-table-column label="符号" prop="symbol" width="120"/>
            <el-table-column label="周期" prop="timeframe" width="120"/>
            <el-table-column label="训练" width="240"><template #default="s">{{ (s.row.train||[]).join(' ~ ') }}</template></el-table-column>
            <el-table-column label="测试" width="240"><template #default="s">{{ (s.row.test||[]).join(' ~ ') }}</template></el-table-column>
            <el-table-column label="参数"><template #default="s">{{ pretty(s.row.params) }}</template></el-table-column>
            <el-table-column label="Sharpe" prop="test_sharpe" width="100"/>
            <el-table-column label="MDD" prop="test_mdd" width="100"/>
            <el-table-column label="交易" prop="test_trades" width="80"/>
            <el-table-column label="PnL" prop="test_pnl" width="120"/>
          </el-table>
        </el-tab-pane>

        <!-- 摘要页签移除：避免展示原始 JSON，聚焦可视化分析 -->
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script>
import * as echarts from 'echarts'
import { getBacktestRecord } from '@/api/backtest'

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
  name: 'BacktestDetailDialog',
  components: { MetricCard },
  props: {
    modelValue: { type: Boolean, default: false },
    taskId: { type: [Number, String], default: null }
  },
  emits: ['update:visible', 'update:modelValue'],
  data() {
    return { visibleInner: this.modelValue, task: {}, loading: false, active: 'overview',
      selectedPair: 'ALL', selectedPairs: [], selectedWindowIndex: 0, sampleOverlayCombined: true, showAllCombined: true,
      rollingWindow: 50,
      equityCurveRef: null, equityCompareRef: null, windowSampleRef: null,
      rollingSharpeRef: null, rollingDdRef: null, sharpeHistRef: null, scatterRef: null,
      pairBarRef: null, tradesHistRef: null, pnlHistRef: null, pairTradeBarRef: null,
      paramChartRefs: {} }
  },
  computed: {
    visible: {
      get() { return this.visibleInner },
      set(v) { this.visibleInner = v; this.$emit('update:modelValue', v); this.$emit('update:visible', v) }
    },
    extra(){
      // 衍生指标（概览展示）
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const trades = ws.map(w=>Number(w.test_trades)).filter(Number.isFinite)
      const pnl = ws.map(w=>Number(w.test_pnl)).filter(Number.isFinite)
      const sharpes = ws.map(w=>Number(w.test_sharpe)).filter(Number.isFinite)
      const turnovers = ws.map(w=>Number(w.test_turnover)).filter(Number.isFinite)
      const windowsCount = ws.length
      const positiveWindowRate = windowsCount ? pnl.filter(v=>v>0).length / windowsCount : 0
      const tradesSorted = trades.slice().sort((a,b)=>a-b)
      const tradesMedian = tradesSorted.length ? tradesSorted[Math.floor((tradesSorted.length-1)/2)] : null
      const turnoverSorted = turnovers.slice().sort((a,b)=>a-b)
      const turnoverMedian = turnoverSorted.length ? turnoverSorted[Math.floor((turnoverSorted.length-1)/2)] : null
      const bestSharpe = sharpes.length ? Math.max(...sharpes) : null
      const worstSharpe = sharpes.length ? Math.min(...sharpes) : null
      // 组合曲线派生
      const pts = this.buildCombinedSeries('ALL')
      const returns = []
      for (let i=1;i<pts.length;i++){ const a=pts[i-1][1], b=pts[i][1]; returns.push(a? (b/a-1):0) }
      const mean = returns.length ? returns.reduce((s,x)=>s+x,0)/returns.length : 0
      const variance = returns.length ? returns.reduce((s,x)=>s + Math.pow(x-mean,2), 0) / (returns.length-1 || 1) : 0
      const vol = Math.sqrt(Math.max(variance,0)) * Math.sqrt(252)
      // 最大回撤
      let peak=-Infinity, mdd=0; for(let i=0;i<pts.length;i++){ peak=Math.max(peak, pts[i][1]); const dd=peak? (pts[i][1]-peak)/peak:0; if (dd<mdd) mdd=dd }
      const ann = returns.length ? (Math.pow(1 + returns.reduce((acc,r)=>acc*(1+r),1)-1, 252/returns.length)-1) : 0
      const sharpe = (vol>0) ? (mean/Math.sqrt(variance))*Math.sqrt(252) : 0
      const calmar = (Math.abs(mdd)>0) ? ann/Math.abs(mdd) : 0
      const tradeWinRate = Number(this.task?.trade_win_rate) || 0
      // 盈亏比相关（来自任务冗余字段的均值）
      const profitFactor = this.task?.profit_factor ?? null
      const winLossRatio = this.task?.win_loss_ratio ?? null
      // 平均盈利/亏损：尽量使用窗口级均值的近似（若后端未提供订单级细分，这里不从窗口PnL拆分）
      const avgWin = this.task?.avg_win ?? null
      const avgLoss = this.task?.avg_loss ?? null
      return { windowsCount, positiveWindowRate, tradesMedian, turnoverMedian, combinedMdd: mdd, combinedVol: vol, combinedSharpe: sharpe, calmar, bestSharpe, worstSharpe, tradeWinRate, profitFactor, winLossRatio, avgWin, avgLoss }
    },
    paramNames() {
      try {
        const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
        const set = new Set()
        ws.forEach(w => Object.keys(w?.params || {}).forEach(k => set.add(String(k))))
        return Array.from(set)
      } catch { return [] }
    },
    windowOptions() {
      try {
        const wins = this.windowListByPair(this.selectedPair)
        return wins.map((w, idx) => ({ index: idx, label: `${w.symbol}|${w.timeframe} ${(w.test||[]).join(' ~ ')}` }))
      } catch { return [] }
    }
  },
  watch: {
    modelValue(v) { this.visibleInner = v; if (v) this.load() },
    taskId() { if (this.visibleInner) this.load() },
    selectedPair() { this.$nextTick(()=>{ this.renderEquityCurve(); this.renderRollingCharts(); this.renderEquityCompare(); this.renderWindowSample() }) },
    rollingWindow() { this.$nextTick(()=> this.renderRollingCharts()) },
    selectedWindowIndex() { this.$nextTick(()=> this.renderWindowSample()) },
    sampleOverlayCombined() { this.$nextTick(()=> this.renderWindowSample()) },
    active() {
      // 切换到非可见 Tab 时，ECharts 初始化可能为 0 宽度，这里在显示时再渲染
      this.$nextTick(()=>{
        if (this.active === 'curves') { this.renderEquityCurve(); this.renderRollingCharts(); this.renderEquityCompare(); this.renderWindowSample() }
        if (this.active === 'dist') { this.renderSharpeHist(); this.renderScatter(); this.renderPairBar(); this.renderTradesHist(); this.renderPnlHist(); this.renderPairTradeBar() }
        if (this.active === 'params') { this.renderParamCharts() }
      })
    }
  },
  methods: {
    async load() {
      if (!this.taskId) return
      this.loading = true
      try {
        const { data } = await getBacktestRecord(this.taskId)
        this.task = data || {}
        this.$nextTick(()=>{
          if (this.active === 'curves') { this.renderEquityCurve(); this.renderRollingCharts(); this.renderEquityCompare(); this.renderWindowSample() }
          if (this.active === 'dist') { this.renderSharpeHist(); this.renderScatter(); this.renderPairBar(); this.renderTradesHist(); this.renderPnlHist(); this.renderPairTradeBar() }
          if (this.active === 'params') { this.renderParamCharts() }
        })
      } finally {
        this.loading = false
      }
    },
    onClose() { this.visible = false },
    renderAllCharts() {
      this.renderEquityCurve(); this.renderEquityCompare(); this.renderWindowSample(); this.renderRollingCharts();
      this.renderSharpeHist(); this.renderScatter(); this.renderTradesHist(); this.renderPnlHist(); this.renderPairBar(); this.renderPairTradeBar(); this.renderParamCharts()
    },
    windowListByPair(pairKey='ALL') { const ws=Array.isArray(this.task?.windows)?this.task.windows:[]; return ws.filter(w=>pairKey==='ALL'?true:`${w.symbol}|${w.timeframe}`===pairKey).filter(w=>Array.isArray(w.equity_times)&&Array.isArray(w.equity_values)&&w.equity_times.length===w.equity_values.length && w.equity_times.length>1) },
    buildWindowSeries(win){ const times=win?.equity_times||[]; const vals=win?.equity_values||[]; if(!times.length||times.length!==vals.length) return []; const base=Number(vals[0]||0); if(!Number.isFinite(base)||base===0) return []; const pts=[]; for(let i=0;i<times.length;i++){ const t=Number(times[i]); const v=Number(vals[i])/base; if(Number.isFinite(t)&&Number.isFinite(v)) pts.push([t,v]) } return pts },
    collectWindowArrays() {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const sharpe = ws.map(w => Number(w.test_sharpe)).filter(Number.isFinite)
      const mdd = ws.map(w => Number(w.test_mdd)).filter(Number.isFinite)
      const pnl = ws.map(w => Number(w.test_pnl)).filter(Number.isFinite)
      const trades = ws.map(w => Number(w.test_trades)).filter(Number.isFinite)
      return { sharpe, mdd, pnl, trades, ws }
    },
    buildCombinedSeries(pairKey='ALL') {
      const ws = Array.isArray(this.task?.windows) ? this.task.windows : []
      const filtered = ws.filter(w => pairKey==='ALL' ? true : `${w.symbol}|${w.timeframe}`===pairKey)
      const timeToVals = new Map()
      filtered.forEach(w => {
        const times = Array.isArray(w.equity_times) ? w.equity_times : []
        const vals = Array.isArray(w.equity_values) ? w.equity_values : []
        if (!times.length || times.length !== vals.length) return
        const base = Number(vals[0]||0)
        if (!Number.isFinite(base) || base===0) return
        for (let i=0;i<times.length;i++) {
          const t=Number(times[i]), v=Number(vals[i])/base
          if (!Number.isFinite(t) || !Number.isFinite(v)) continue
          if (!timeToVals.has(t)) timeToVals.set(t, [])
          timeToVals.get(t).push(v)
        }
      })
      return Array.from(timeToVals.entries()).sort((a,b)=>a[0]-b[0]).map(([t,arr])=>[t, arr.reduce((s,x)=>s+x,0)/arr.length])
    },
    ensureChart(el) { const inst = echarts.getInstanceByDom(el) || (el ? echarts.init(el) : null); if (inst) { try { inst.resize() } catch(e){} } return inst },
    renderEquityCurve() {
      const pts = this.buildCombinedSeries(this.selectedPair)
      const el = this.$refs.equityCurveRef; if (!el) return
      const chart = this.ensureChart(el)
      chart.setOption({ tooltip:{trigger:'axis'}, xAxis:{type:'time'}, yAxis:{type:'value', name:'归一化净值'}, series:[{type:'line', data:pts, showSymbol:false, smooth:true}] })
    },
    renderEquityCompare(){ const el=this.$refs.equityCompareRef; if(!el) return; const chart=this.ensureChart(el); const series=[]; const legend=[]; if(this.showAllCombined){ const ptsAll=this.buildCombinedSeries('ALL'); series.push({name:'ALL',type:'line',showSymbol:false,smooth:true,data:ptsAll}); legend.push('ALL') } const colors=['#5470C6','#91CC75','#EE6666','#73C0DE','#FAC858','#3BA272','#FC8452','#9A60B4','#ea7ccc']; (this.selectedPairs||[]).forEach((k,idx)=>{ const pts=this.buildCombinedSeries(k); series.push({name:k,type:'line',showSymbol:false,smooth:true,data:pts,lineStyle:{width:2},itemStyle:{color:colors[idx%colors.length]}}); legend.push(k) }); chart.setOption({ tooltip:{trigger:'axis'}, legend:{data:legend, top:4}, xAxis:{type:'time'}, yAxis:{type:'value', name:'归一化净值'}, series }) },
    renderWindowSample(){ const el=this.$refs.windowSampleRef; if(!el) return; const chart=this.ensureChart(el); const wins=this.windowListByPair(this.selectedPair); if(!wins.length){ chart&&chart.clear(); return } const idx=Math.min(Math.max(0,this.selectedWindowIndex||0), wins.length-1); const target=wins[idx]; const series=[]; const pts=this.buildWindowSeries(target); series.push({ name:`样例-${idx+1}`, type:'line', showSymbol:false, smooth:true, data:pts }); if(this.sampleOverlayCombined){ const overlay=this.buildCombinedSeries(this.selectedPair); series.push({ name:'组合', type:'line', showSymbol:false, smooth:true, data:overlay, lineStyle:{type:'dashed'} }) } chart.setOption({ tooltip:{trigger:'axis'}, legend:{top:4}, xAxis:{type:'time'}, yAxis:{type:'value', name:'归一化净值'}, series }) },
    computeReturns(points){ const ret=[]; for(let i=1;i<points.length;i++){ const a=points[i-1][1], b=points[i][1]; ret.push(a? (b/a-1):0) } return ret },
    renderRollingCharts(){ const pts=this.buildCombinedSeries(this.selectedPair); if(!pts.length) return; const rets=this.computeReturns(pts); const win=Math.max(5,this.rollingWindow); const mean=(arr)=>arr.reduce((s,x)=>s+x,0)/arr.length; const std=(arr)=>{const m=mean(arr); return Math.sqrt(arr.reduce((s,x)=>s+(x-m)**2,0)/(arr.length-1||1))}; const sharpe=[]; for(let i=win-1;i<rets.length;i++){ const sl=rets.slice(i-win+1,i+1); const s=std(sl); sharpe[i]= s>0? (mean(sl)/s)*Math.sqrt(252):0 } const dd=[]; let peak=-Infinity; for(let i=0;i<pts.length;i++){ peak=Math.max(peak, pts[i][1]); dd.push(peak? (pts[i][1]-peak)/peak:0) } const times=pts.map(p=>p[0]).slice(1); const sp=sharpe.map((v,i)=>[times[i]||times[0], v]); const dp=dd.map((v,i)=>[pts[i][0], v]); const sEl=this.$refs.rollingSharpeRef; if(sEl){ const c=this.ensureChart(sEl); c && c.setOption({xAxis:{type:'time'}, yAxis:{type:'value', name:'Sharpe'}, series:[{type:'line', data:sp, showSymbol:false}]}) } const dEl=this.$refs.rollingDdRef; if(dEl){ const c=this.ensureChart(dEl); c && c.setOption({xAxis:{type:'time'}, yAxis:{type:'value', name:'回撤', axisLabel:{formatter:v=>`${(v*100).toFixed(0)}%`}}, series:[{type:'line', data:dp, areaStyle:{}, showSymbol:false}]}) } },
    renderSharpeHist(){ const {sharpe}=this.collectWindowArrays(); const bins=[-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,3]; const counts=new Array(bins.length-1).fill(0); sharpe.forEach(v=>{ for(let i=0;i<bins.length-1;i++) if(v>=bins[i] && v<bins[i+1]){ counts[i]++; break } }); const el=this.$refs.sharpeHistRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({xAxis:{type:'category', data:counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`), axisLabel:{rotate:45}}, yAxis:{type:'value'}, series:[{type:'bar', data:counts}]}) },
    renderTradesHist(){ const {trades}=this.collectWindowArrays(); if(!trades.length) return; const bins=[0,1,2,3,5,8,13,21]; const counts=new Array(bins.length-1).fill(0); trades.forEach(v=>{ for(let i=0;i<bins.length-1;i++) if(v>=bins[i] && v<bins[i+1]) { counts[i]++; break } }); const el=this.$refs.tradesHistRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({ xAxis:{type:'category', data:counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`)}, yAxis:{type:'value'}, series:[{type:'bar', data:counts}] }) },
    renderPnlHist(){ const {pnl}=this.collectWindowArrays(); if(!pnl.length) return; const bins=[-5000,-2000,-1000,-500,-100,0,100,500,1000,2000,5000]; const counts=new Array(bins.length-1).fill(0); pnl.forEach(v=>{ for(let i=0;i<bins.length-1;i++) if(v>=bins[i] && v<bins[i+1]) { counts[i]++; break } }); const el=this.$refs.pnlHistRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({ xAxis:{type:'category', data:counts.map((_,i)=>`${bins[i]}~${bins[i+1]}`)}, yAxis:{type:'value'}, series:[{type:'bar', data:counts}] }) },
    renderScatter(){ const {sharpe,mdd,trades}=this.collectWindowArrays(); const data=sharpe.map((s,i)=>[mdd[i]??0, s, trades[i]??0]); const el=this.$refs.scatterRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({tooltip:{trigger:'item', formatter:p=>`MDD:${(p.data[0]*100).toFixed(0)}%<br/>Sharpe:${p.data[1].toFixed(2)}<br/>Trades:${p.data[2]}`}, xAxis:{type:'value', name:'MDD', axisLabel:{formatter:v=>`${(v*100).toFixed(0)}%`}}, yAxis:{type:'value', name:'Sharpe'}, series:[{type:'scatter', data, symbolSize:d=>6+Math.min(20,d[2]||0)}]}) },
    renderPairBar(){ const sm=this.task?.summary||{}; const entries=Object.entries(sm); const names=entries.map(([k])=>k); const values=entries.map(([_,v])=>Number(v.sharpe_median||0)); const el=this.$refs.pairBarRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({grid:{left:80,right:20,top:20,bottom:60}, xAxis:{type:'category', data:names, axisLabel:{rotate:45}}, yAxis:{type:'value', name:'Sharpe中位数'}, series:[{type:'bar', data:values}]}) },
    renderPairTradeBar(){ const sm=this.task?.summary||{}; const entries=Object.entries(sm); const names=entries.map(([k])=>k); const values=entries.map(([_,v])=>{ const x=Number(v.trade_win_rate); return Number.isFinite(x)?x:0 }); const el=this.$refs.pairTradeBarRef; if(!el) return; const c=this.ensureChart(el); c && c.setOption({ tooltip:{formatter:p=>`${p.name}<br/>交易胜率：${(p.data*100).toFixed(2)}%`}, grid:{left:80,right:20,top:20,bottom:60}, xAxis:{type:'category', data:names, axisLabel:{rotate:45}}, yAxis:{type:'value', name:'交易胜率', axisLabel:{formatter:v=>`${(v*100).toFixed(0)}%`}}, series:[{type:'bar', data:values}] }) },
    setParamRef(name, el){ if (el) this.paramChartRefs[name] = el },
    renderParamCharts(){ const ws=Array.isArray(this.task?.windows)?this.task.windows:[]; if(!ws.length) return; const dist={}; ws.forEach(w=>{ const p=w.params||{}; Object.entries(p).forEach(([k,v])=>{ const key=String(k); const val=Array.isArray(v)?v.join(','):String(v); dist[key]=dist[key]||{}; dist[key][val]=(dist[key][val]||0)+1 }) }); Object.entries(dist).forEach(([name,counts])=>{ const el=this.paramChartRefs[name]; if(!el) return; const c=this.ensureChart(el); const labels=Object.keys(counts); const values=labels.map(l=>counts[l]); c && c.setOption({ xAxis:{type:'category', data:labels, axisLabel:{rotate:45}}, yAxis:{type:'value', name:'出现次数'}, series:[{type:'bar', data:values}] }) }) },
    formatNumber(num, decimals = 2) { if (num === undefined || num === null) return '-'; return Number(num).toFixed(decimals).replace(/\.?0+$/, '') },
    formatPercent(v) { if (v === undefined || v === null) return '-'; return (Number(v) * 100).toFixed(2) + '%' },
    pretty(obj) { try { return JSON.stringify(obj || {}, null, 2) } catch { return '-' } },
    statusType(s) { return { running: 'warning', completed: 'success', failed: 'danger' }[s] || 'info' },
    statusText(s) { return { pending: '排队中', running: '运行中', completed: '已完成', failed: '失败' }[s] || s }
  }
}
</script>

<style scoped>
.mb8 { margin-bottom: 8px; }
.mb12 { margin-bottom: 12px; }
.metric-card { text-align: center; }
.metric-title { color:#909399; font-size: 12px; }
.metric-value { font-size: 20px; font-weight: 600; }
.metric-value.pos { color:#67c23a; }
.metric-value.neg { color:#f56c6c; }
.json-pre { background:#f7f7f7; padding:12px; border-radius:6px; max-height:420px; overflow:auto; }
.toolbar { display:flex; align-items:center; }
</style>


