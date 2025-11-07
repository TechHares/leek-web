<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="task.name || '回测结果'"
    width="85%"
    top="3vh"
    height="80vh"
    :close-on-click-modal="false"
    class="results-dialog"
  >
    <div v-loading="loading" class="dialog-content">
      <el-tabs v-model="activeTab" type="card" class="results-tabs">
        <!-- 概览 -->
        <el-tab-pane label="概览" name="overview">
          <div class="tab-content">
          <el-row :gutter="16" style="margin-bottom: 5px;">
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  总收益率
                  <el-tooltip placement="top" content="整个回测期间的总收益百分比。正值表示盈利，负值表示亏损。一般希望收益率越高越好，但需要结合风险指标综合评估。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value" :style="getTrendStyle(metrics.total_return)">
                  {{ formatPercent(metrics.total_return) }}
                </div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  夏普比率
                  <el-tooltip placement="top" content="衡量风险调整后收益的指标，公式为(收益率-无风险利率)/波动率。夏普比率>1为良好，>2为优秀，>3为卓越。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value">
                  {{ formatNumber(metrics.sharpe_ratio, 2) }}
                </div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  最大回撤
                  <el-tooltip placement="top" content="从历史最高点到最低点的最大跌幅。回撤越小越好，一般<10%为良好，<20%为可接受，>30%需要谨慎。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value" style="color: #f56c6c;">
                  {{ formatPercent(Math.abs(metrics.max_drawdown || 0)) }}
                </div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  胜率
                  <el-tooltip placement="top" content="盈利交易占总交易的比例。胜率>50%为良好，>60%为优秀。但胜率不是唯一指标，需要结合盈亏比分析。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value">
                  {{ formatPercent(metrics.win_rate) }}
                </div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  总交易数
                  <el-tooltip placement="top" content="回测期间的总交易次数。交易次数太少可能样本不足，太多可能过度交易。一般需要至少30次交易才有统计意义。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value">
                  {{ metrics.total_trades || 0 }}
                </div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="metric-card">
                <div class="metric-title">
                  统计显著性
                  <el-tooltip placement="top" content="t检验p值，衡量策略收益是否显著大于0。p<0.05表示显著，p<0.1表示边际显著。">
                    <el-icon class="label-q"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="metric-value" :style="getStatisticalSignificanceStyle(metrics.t_pvalue)">
                  {{ formatStatisticalSignificance(metrics.t_pvalue) }}
                </div>
              </div>
            </el-col>
          </el-row>

          <!-- WF 概览统计，仅在 walk_forward 显示 -->
          <el-card v-if="isWFMode()" style="margin-bottom: 16px;">
            <template #header><h4 style="margin: 0;">Walk-Forward 窗口统计</h4></template>
            <el-row :gutter="16">
              <el-col :span="4"><div class="metric-card"><div class="metric-title">窗口数</div><div class="metric-value">{{ wfStats.total }}</div></div></el-col>
              <el-col :span="4"><div class="metric-card"><div class="metric-title">Sharpe 中位</div><div class="metric-value">{{ formatNumber(wfStats.sharpe_median, 2) }}</div></div></el-col>
              <el-col :span="4"><div class="metric-card"><div class="metric-title">Sharpe P25</div><div class="metric-value">{{ formatNumber(wfStats.sharpe_p25, 2) }}</div></div></el-col>
              <el-col :span="4"><div class="metric-card"><div class="metric-title">回撤中位</div><div class="metric-value">{{ formatPercent(Math.abs(wfStats.mdd_median||0)) }}</div></div></el-col>
              <el-col :span="4"><div class="metric-card"><div class="metric-title">交易数中位</div><div class="metric-value">{{ wfStats.trades_median || 0 }}</div></div></el-col>
              <el-col :span="4"><div class="metric-card"><div class="metric-title">优化目标</div><div class="metric-value">{{ task?.config?.optimization_objective || '-' }}</div></div></el-col>
            </el-row>
          </el-card>

          <!-- WF 推荐参数 -->
          <el-card v-if="isWFMode() && wfRecommendation && Object.keys(wfRecommendation.recommended_params||{}).length" style="margin-bottom: 16px;">
            <template #header><h4 style="margin: 0;">推荐参数（稳健优先）</h4></template>
            <el-row :gutter="16">
              <el-col :span="10">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="覆盖窗口">
                    {{ wfRecommendation.coverage }}/{{ wfRecommendation.total_windows }}（{{ formatPercent(wfRecommendation.coverage/(wfRecommendation.total_windows||1)) }}）
                  </el-descriptions-item>
                  <el-descriptions-item label="Sharpe中位">{{ formatNumber(wfRecommendation.median_sharpe, 3) }}</el-descriptions-item>
                  <el-descriptions-item label="回撤中位">{{ formatPercent(Math.abs(wfRecommendation.median_mdd||0)) }}</el-descriptions-item>
                  <el-descriptions-item label="年化中位">{{ formatPercent(wfRecommendation.median_annual) }}</el-descriptions-item>
                  <el-descriptions-item label="盈亏比中位">{{ formatNumber(wfRecommendation.median_profit_factor, 2) }}</el-descriptions-item>
                </el-descriptions>
              </el-col>
              <el-col :span="14">
                <div style="display:flex; align-items:start; gap:12px;">
                  <pre style="flex:1; background:#f5f7fa; padding:10px; border-radius:4px; max-height:160px; overflow:auto; font-size:12px;">{{ JSON.stringify(wfRecommendation.recommended_params, null, 2) }}</pre>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    <el-button size="small" type="primary" @click="copyToClipboard(JSON.stringify(wfRecommendation.recommended_params))">复制参数</el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
            <el-divider content-position="left">参数排名（前五）</el-divider>
            <el-table :data="(wfRecommendation.rankings||[]).slice(0,5)" border size="small">
              <el-table-column label="覆盖" width="110">
                <template #default="scope">{{ scope.row.count }}/{{ wfRecommendation.total_windows }}（{{ formatPercent(scope.row.coverage_ratio) }}）</template>
              </el-table-column>
              <el-table-column label="Sharpe中位" width="120">
                <template #default="scope">{{ formatNumber(scope.row.median_sharpe, 3) }}</template>
              </el-table-column>
              <el-table-column label="回撤中位" width="120">
                <template #default="scope">{{ formatPercent(Math.abs(scope.row.median_mdd||0)) }}</template>
              </el-table-column>
              <el-table-column label="年化中位" width="120">
                <template #default="scope">{{ formatPercent(scope.row.median_annual) }}</template>
              </el-table-column>
              <el-table-column label="参数" min-width="180">
                <template #default="scope">
                  <el-popover placement="top" trigger="hover" :width="360">
                    <template #reference>
                      <span style="color:#409eff; cursor: help;">查看</span>
                    </template>
                    <pre style="white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(scope.row.params || {}, null, 2) }}</pre>
                  </el-popover>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card style="margin-bottom: 16px;">
            <template #header><h4 style="margin: 0;">净值曲线</h4></template>
            <div ref="equityChart" style="height: 350px;"></div>
          </el-card>

          <el-card>
            <template #header><h4 style="margin: 0;">回撤曲线</h4></template>
            <div ref="drawdownChart" style="height: 250px;"></div>
          </el-card>
          </div>
        </el-tab-pane>

        <!-- 详细指标 -->
        <el-tab-pane label="详细指标" name="metrics">
          <div class="tab-content">
            <template v-if="isNormalMode()">
              <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span>分组：</span>
                <el-select v-model="metricsGroupBy" size="small" style="width: 140px;">
                  <el-option label="按标的" value="symbol" />
                  <el-option label="按周期" value="timeframe" />
                </el-select>
                <span v-if="zeroTradeWindowsCount > 0" style="color: #909399; font-size: 12px;">
                  已过滤0交易窗口 {{ zeroTradeWindowsCount }} 条
                </span>
                <span style="margin-left: auto;">其他数据：</span>
                <el-select 
                  v-model="selectedExtraColumns" 
                  multiple 
                  collapse-tags
                  collapse-tags-tooltip
                  size="small" 
                  style="width: 400px;"
                  placeholder="选择要显示的额外列"
                >
                  <el-option label="做多次数" value="long_trades" />
                  <el-option label="做空次数" value="short_trades" />
                  <el-option label="做多胜率" value="long_win_rate" />
                  <el-option label="做空胜率" value="short_win_rate" />
                  <el-option label="做多平均收益" value="avg_pnl_long" />
                  <el-option label="做空平均收益" value="avg_pnl_short" />
                  <el-option label="做多平均收益率" value="avg_return_long" />
                  <el-option label="做空平均收益率" value="avg_return_short" />
                  <el-option label="做多中位数收益" value="median_pnl_long" />
                  <el-option label="做空中位数收益" value="median_pnl_short" />
                  <el-option label="做多中位数收益率" value="median_return_long" />
                  <el-option label="做空中位数收益率" value="median_return_short" />
                  <el-option label="平均利润" value="avg_win" />
                  <el-option label="平均亏损" value="avg_loss" />
                  <el-option label="做多平均利润" value="avg_win_long" />
                  <el-option label="做空平均利润" value="avg_win_short" />
                  <el-option label="做多平均亏损" value="avg_loss_long" />
                  <el-option label="做空平均亏损" value="avg_loss_short" />
                </el-select>
              </div>
              <el-table :data="metricsTableRows" border stripe size="small" max-height="400">
                <el-table-column :label="metricsGroupBy==='symbol' ? '标的' : '周期'" prop="group" min-width="120" />
                <el-table-column label="区间收益" prop="total_return" min-width="120" sortable>
                  <template #default="scope">{{ displayWithMarker('total_return', scope.row.total_return, 'percent') }}</template>
                </el-table-column>
                <el-table-column label="最大回撤" prop="max_drawdown" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('max_drawdown', scope.row.max_drawdown, 'mdd') }}</template>
                </el-table-column>
                <el-table-column label="夏普比率" prop="sharpe_ratio" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('sharpe_ratio', scope.row.sharpe_ratio, 'number') }}</template>
                </el-table-column>
                <el-table-column label="交易次数" prop="total_trades" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('total_trades', scope.row.total_trades, 'number', 0) }}</template>
                </el-table-column>
                <el-table-column label="胜率" prop="win_rate" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('win_rate', scope.row.win_rate, 'percent') }}</template>
                </el-table-column>
                <el-table-column label="盈亏比" prop="profit_factor" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('profit_factor', scope.row.profit_factor, 'number', 2) }}</template>
                </el-table-column>
                <!-- 额外列：做多次数 -->
                <el-table-column v-if="selectedExtraColumns.includes('long_trades')" label="做多次数" prop="long_trades" min-width="100" sortable>
                  <template #default="scope">{{ displayWithMarker('long_trades', scope.row.long_trades, 'number', 0) }}</template>
                </el-table-column>
                <!-- 额外列：做空次数 -->
                <el-table-column v-if="selectedExtraColumns.includes('short_trades')" label="做空次数" prop="short_trades" min-width="100" sortable>
                  <template #default="scope">{{ displayWithMarker('short_trades', scope.row.short_trades, 'number', 0) }}</template>
                </el-table-column>
                <!-- 额外列：做多胜率 -->
                <el-table-column v-if="selectedExtraColumns.includes('long_win_rate')" label="做多胜率" prop="long_win_rate" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('long_win_rate', scope.row.long_win_rate, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：做空胜率 -->
                <el-table-column v-if="selectedExtraColumns.includes('short_win_rate')" label="做空胜率" prop="short_win_rate" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('short_win_rate', scope.row.short_win_rate, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：做多平均收益 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_pnl_long')" label="做多平均收益" prop="avg_pnl_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_pnl_long', scope.row.avg_pnl_long, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做空平均收益 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_pnl_short')" label="做空平均收益" prop="avg_pnl_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_pnl_short', scope.row.avg_pnl_short, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做多平均收益率 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_return_long')" label="做多平均收益率" prop="avg_return_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_return_long', scope.row.avg_return_long, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：做空平均收益率 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_return_short')" label="做空平均收益率" prop="avg_return_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_return_short', scope.row.avg_return_short, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：做多中位数收益 -->
                <el-table-column v-if="selectedExtraColumns.includes('median_pnl_long')" label="做多中位数收益" prop="median_pnl_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('median_pnl_long', scope.row.median_pnl_long, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做空中位数收益 -->
                <el-table-column v-if="selectedExtraColumns.includes('median_pnl_short')" label="做空中位数收益" prop="median_pnl_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('median_pnl_short', scope.row.median_pnl_short, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做多中位数收益率 -->
                <el-table-column v-if="selectedExtraColumns.includes('median_return_long')" label="做多中位数收益率" prop="median_return_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('median_return_long', scope.row.median_return_long, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：做空中位数收益率 -->
                <el-table-column v-if="selectedExtraColumns.includes('median_return_short')" label="做空中位数收益率" prop="median_return_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('median_return_short', scope.row.median_return_short, 'percent') }}</template>
                </el-table-column>
                <!-- 额外列：平均利润 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_win')" label="平均利润" prop="avg_win" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_win', scope.row.avg_win, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：平均亏损 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_loss')" label="平均亏损" prop="avg_loss" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_loss', scope.row.avg_loss, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做多平均利润 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_win_long')" label="做多平均利润" prop="avg_win_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_win_long', scope.row.avg_win_long, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做空平均利润 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_win_short')" label="做空平均利润" prop="avg_win_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_win_short', scope.row.avg_win_short, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做多平均亏损 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_loss_long')" label="做多平均亏损" prop="avg_loss_long" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_loss_long', scope.row.avg_loss_long, 'number') }}</template>
                </el-table-column>
                <!-- 额外列：做空平均亏损 -->
                <el-table-column v-if="selectedExtraColumns.includes('avg_loss_short')" label="做空平均亏损" prop="avg_loss_short" min-width="110" sortable>
                  <template #default="scope">{{ displayWithMarker('avg_loss_short', scope.row.avg_loss_short, 'number') }}</template>
                </el-table-column>
              </el-table>
              <div style="margin-top: 8px;">
                <el-table :data="metricsSummaryRows" border size="small" show-header="false">
                  <el-table-column prop="label" width="120" />
                  <el-table-column>
                    <template #default="scope">
                      区间收益：{{ formatPercent(scope.row.total_return) }} ｜ 回撤：{{ formatPercent(Math.abs(scope.row.max_drawdown||0)) }} ｜ 夏普：{{ formatNumber(scope.row.sharpe_ratio, 2) }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 二维透视表：标的 × 周期 -->
              <el-divider content-position="left">标的 × 周期 二维透视</el-divider>
              <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                <span>指标：</span>
                <el-select v-model="pivotMetric" size="small" style="width: 160px;">
                  <el-option label="夏普比率" value="sharpe_ratio" />
                  <el-option label="区间收益" value="total_return" />
                  <el-option label="最大回撤" value="max_drawdown" />
                  <el-option label="胜率" value="win_rate" />
                </el-select>
              </div>
              <el-table :data="pivotRows" border stripe size="small">
                <el-table-column label="标的" prop="symbol" fixed width="140" />
                <el-table-column v-for="tf in pivotColumns" :key="tf" :label="tf" :prop="tf" min-width="110">
                  <template #default="scope">
                    {{ displayPivot(scope.row[tf]) }}
                  </template>
                </el-table-column>
              </el-table>
            </template>
            <template v-else>
              <!-- 单窗口/走向前：保留原有描述块 -->
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-card>
                    <template #header><h4 style="margin: 0;">收益指标</h4></template>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item>
                        <template #label>
                          总收益率
                          <el-tooltip placement="top" content="整个回测期间的总收益百分比。正值表示盈利，负值表示亏损。一般希望收益率越高越好，但需要结合风险指标综合评估。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.total_return) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          区间收益
                          <el-tooltip placement="top" content="整个回测期间的总收益百分比。正值表示盈利，负值表示亏损。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.total_return) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          波动率
                          <el-tooltip placement="top" content="收益率的标准差，衡量收益的稳定性。波动率越小表示收益越稳定。一般<15%为低波动，15%-25%为中等波动，>25%为高波动。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.volatility) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          夏普比率
                          <el-tooltip placement="top" content="衡量风险调整后收益的指标，公式为(收益率-无风险利率)/波动率。夏普比率>1为良好，>2为优秀，>3为卓越。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.sharpe_ratio, 3) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          卡尔玛比率
                          <el-tooltip placement="top" content="年化收益率与最大回撤的比值，衡量风险调整后收益。卡尔玛比率>1为良好，>2为优秀，>3为卓越。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.calmar_ratio, 3) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          索提诺比率
                          <el-tooltip placement="top" content="类似夏普比率，但只考虑下行波动率。索提诺比率>1为良好，>2为优秀。相比夏普比率，索提诺比率更关注下行风险。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.sortino_ratio, 3) }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card>
                    <template #header><h4 style="margin: 0;">交易指标</h4></template>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item>
                        <template #label>
                          总交易数
                          <el-tooltip placement="top" content="回测期间的总交易次数。交易次数太少可能样本不足，太多可能过度交易。一般需要至少30次交易才有统计意义。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ metrics.total_trades || 0 }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          胜率
                          <el-tooltip placement="top" content="盈利交易占总交易的比例。胜率>50%为良好，>60%为优秀。但胜率不是唯一指标，需要结合盈亏比分析。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.win_rate) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          做多胜率
                          <el-tooltip placement="top" content="做多交易中盈利交易的比例。可以分析策略在上涨行情中的表现。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.long_win_rate) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          做空胜率
                          <el-tooltip placement="top" content="做空交易中盈利交易的比例。可以分析策略在下跌行情中的表现。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.short_win_rate) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          盈利交易
                          <el-tooltip placement="top" content="盈利的交易次数。结合亏损交易数可以分析策略的盈亏分布情况。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ metrics.win_trades || 0 }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          亏损交易
                          <el-tooltip placement="top" content="亏损的交易次数。结合盈利交易数可以分析策略的盈亏分布情况。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ metrics.loss_trades || 0 }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          盈亏比
                          <el-tooltip placement="top" content="总盈利与总亏损的比值。盈亏比>1为盈利，>1.5为良好，>2为优秀。高盈亏比可以弥补低胜率的不足。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.profit_factor, 2) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          平均盈利
                          <el-tooltip placement="top" content="单次盈利交易的平均收益。结合平均亏损可以分析策略的风险收益特征。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.avg_win, 2) }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card>
                    <template #header><h4 style="margin: 0;">风险指标</h4></template>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item>
                        <template #label>
                          最大回撤
                          <el-tooltip placement="top" content="从历史最高点到最低点的最大跌幅。回撤越小越好，一般<10%为良好，<20%为可接受，>30%需要谨慎。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(Math.abs(metrics.max_drawdown || 0)) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          平均亏损
                          <el-tooltip placement="top" content="单次亏损交易的平均损失。结合平均盈利可以分析策略的风险收益特征。平均亏损越小越好。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.avg_loss, 2) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          偏度
                          <el-tooltip placement="top" content="收益率分布的偏斜程度。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.skewness, 3) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          峰度
                          <el-tooltip placement="top" content="收益率分布的尖锐程度。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatNumber(metrics.kurtosis, 3) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          VaR(95%)
                          <el-tooltip placement="top" content="95%置信度下的风险价值。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.var_95) }}
                      </el-descriptions-item>
                      <el-descriptions-item>
                        <template #label>
                          CVaR(95%)
                          <el-tooltip placement="top" content="95%置信度下的条件风险价值。">
                            <el-icon class="label-q"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        {{ formatPercent(metrics.cvar_95) }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
              </el-row>
            </template>
          </div>
        </el-tab-pane>

        <!-- 统计检验 -->
        <el-tab-pane label="统计检验" name="statistical">
          <div class="tab-content">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">t检验结果</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="t统计量">
                      {{ formatNumber(metrics.t_statistic, 4) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="p值">
                      <span :style="getStatisticalSignificanceStyle(metrics.t_pvalue)">
                        {{ formatNumber(metrics.t_pvalue, 4) }}
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="统计显著性">
                      {{ formatStatisticalSignificance(metrics.t_pvalue) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        <template v-if="metrics.t_pvalue === 1.0 && (metrics.t_statistic === undefined || metrics.t_statistic === 0.0)">
                          净值数据点不足（少于2个），无法计算t检验。请确保回测有足够的数据点。
                        </template>
                        <template v-else>
                          单样本t检验，检验策略收益率是否显著大于0。p值越小，说明策略收益越不可能是随机产生的。
                        </template>
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card v-if="metrics.paired_t_statistic !== undefined && metrics.paired_t_statistic !== 0">
                  <template #header><h4 style="margin: 0;">配对t检验（vs基准）</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="t统计量">
                      {{ formatNumber(metrics.paired_t_statistic, 4) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="p值">
                      <span :style="getStatisticalSignificanceStyle(metrics.paired_t_pvalue)">
                        {{ formatNumber(metrics.paired_t_pvalue, 4) }}
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="统计显著性">
                      {{ formatStatisticalSignificance(metrics.paired_t_pvalue) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        配对t检验，检验策略是否显著优于基准。p值越小，说明策略越显著优于基准。
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
                <el-card v-else>
                  <template #header><h4 style="margin: 0;">配对t检验（vs基准）</h4></template>
                  <div style="color: #909399; padding: 20px; text-align: center;">
                    无基准数据，无法进行配对t检验
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-row :gutter="16" style="margin-top: 16px;">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">Bootstrap置信区间（Sharpe比率）</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="Sharpe比率">
                      {{ formatNumber(metrics.sharpe_ratio, 3) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="95%置信区间下界">
                      {{ formatNumber(metrics.bootstrap_sharpe_ci_lower, 3) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="95%置信区间上界">
                      {{ formatNumber(metrics.bootstrap_sharpe_ci_upper, 3) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        通过Bootstrap重采样（1000次）估计Sharpe比率的置信区间。区间越窄，说明Sharpe比率的估计越稳健。
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">Bootstrap置信区间（年化收益率）</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="年化收益率">
                      {{ formatPercent(metrics.annual_return) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="95%置信区间下界">
                      {{ formatPercent(metrics.bootstrap_annual_return_ci_lower) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="95%置信区间上界">
                      {{ formatPercent(metrics.bootstrap_annual_return_ci_upper) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        通过Bootstrap重采样（1000次）估计年化收益率的置信区间。区间越窄，说明年化收益率的估计越稳健。
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
            </el-row>

            <el-row :gutter="16" style="margin-top: 16px;">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">胜率二项检验</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="胜率">
                      {{ formatPercent(metrics.win_rate) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="p值">
                      <span :style="getStatisticalSignificanceStyle(metrics.win_rate_pvalue)">
                        {{ formatNumber(metrics.win_rate_pvalue, 4) }}
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="统计显著性">
                      {{ formatStatisticalSignificance(metrics.win_rate_pvalue) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        二项检验，检验胜率是否显著大于50%。p值越小，说明胜率越不可能是随机产生的。
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
              <el-col :span="12" v-if="metrics.paired_t_statistic !== undefined && metrics.paired_t_statistic !== 0">
                <el-card>
                  <template #header><h4 style="margin: 0;">Alpha显著性检验</h4></template>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="Alpha">
                      {{ formatPercent(metrics.alpha) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Beta">
                      {{ formatNumber(metrics.beta, 3) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="R²">
                      {{ formatNumber(metrics.r_squared, 3) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Alpha p值">
                      <span :style="getStatisticalSignificanceStyle(metrics.alpha_pvalue)">
                        {{ formatNumber(metrics.alpha_pvalue, 4) }}
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="解释">
                      <div style="font-size: 12px; color: #606266;">
                        Alpha衡量策略的超额收益（相对于基准）。p值越小，说明Alpha越显著不为0。
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 窗口详情 -->
        <el-tab-pane v-if="task.type === 'walk_forward'" label="窗口详情" name="windows">
          <div class="tab-content">
          <el-table :data="windows" border stripe size="small" max-height="400" :row-class-name="wfRowClassName">
            <el-table-column prop="window_idx" width="70">
              <template #header>
                窗口
                <el-tooltip placement="top" content="窗口编号，用于标识不同的测试窗口">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="symbol" width="80">
              <template #header>
                标的
                <el-tooltip placement="top" content="测试的交易标的，如股票代码、期货合约等">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="timeframe" width="70">
              <template #header>
                周期
                <el-tooltip placement="top" content="数据的时间周期，如1分钟、5分钟、日线等">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column min-width="180">
              <template #header>
                测试期
                <el-tooltip placement="top" content="该窗口的测试时间范围，显示开始和结束日期">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <template #default="scope">
                {{ scope.row.test_period?.[0] }} ~ {{ scope.row.test_period?.[1] }}
              </template>
            </el-table-column>
            <el-table-column width="90" align="right">
              <template #header>
                夏普
                <el-tooltip placement="top" content="该窗口的夏普比率，衡量风险调整后收益。夏普比率>1为良好，>2为优秀。">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <template #default="scope">
                {{ formatNumber(scope.row.test_metrics?.sharpe_ratio, 2) }}
              </template>
            </el-table-column>
            <el-table-column width="100" align="right">
              <template #header>
                收益率
                <el-tooltip placement="top" content="该窗口的总收益率，正值表示盈利，负值表示亏损">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <template #default="scope">
                <span :class="getTrendClass(scope.row.test_metrics?.total_return)">
                  {{ formatPercent(scope.row.test_metrics?.total_return) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column width="80" align="right">
              <template #header>
                交易数
                <el-tooltip placement="top" content="该窗口的交易次数，用于评估策略在该时间段的活跃度">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <template #default="scope">
                {{ (scope.row.test_metrics || scope.row.metrics || {}).total_trades || 0 }}
              </template>
            </el-table-column>
            <el-table-column min-width="160">
              <template #header>
                最佳参数
                <el-tooltip placement="top" content="本窗口训练阶段选出的最优参数">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <template #default="scope">
                <el-popover placement="top" trigger="hover" :width="360">
                  <template #reference>
                    <span style="color:#409eff; cursor: help;">查看</span>
                  </template>
                  <pre style="white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(scope.row.best_params || {}, null, 2) }}</pre>
                </el-popover>
              </template>
            </el-table-column>
          </el-table>
          </div>
        </el-tab-pane>

        <!-- WF 稳健性分析（仅 walk_forward） -->
        <el-tab-pane v-if="isWFMode()" label="WF稳健性" name="wf_robustness">
          <div class="tab-content">
            <el-row :gutter="16">
              <el-col :span="24">
                <el-card>
                  <template #header>
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                      <h4 style="margin: 0;">每窗口 指标时间序列（按 标的/周期 聚合）</h4>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color:#909399;">指标：</span>
                        <el-radio-group v-model="wfTimelineMetric" size="small" @change="onWFTimelineMetricChange">
                          <el-radio-button label="sharpe_ratio">Sharpe</el-radio-button>
                          <el-radio-button label="calmar_ratio">Calmar</el-radio-button>
                          <el-radio-button label="sortino_ratio">Sortino</el-radio-button>
                          <el-radio-button label="profit_factor">盈亏比</el-radio-button>
                          <el-radio-button label="win_rate">胜率</el-radio-button>
                        </el-radio-group>
                      </div>
                    </div>
                  </template>
                  <div ref="wfSharpeTimeline" style="height: 320px;"></div>
                </el-card>
              </el-col>
            </el-row>
            <el-row :gutter="16" style="margin-top: 12px;">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">Sharpe 分布（直方图）</h4></template>
                  <div ref="wfHistSharpe" style="height: 280px;"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">按 标的×周期 平均 Sharpe</h4></template>
                  <el-table :data="wfAvgBySymbolTf" border size="small" style="width: 100%;" :table-layout="'fixed'">
                    <el-table-column prop="symbol" label="标的" width="120" />
                    <el-table-column prop="timeframe" label="周期" width="100" />
                    <el-table-column prop="sharpe" label="平均Sharpe" width="140">
                      <template #default="scope">{{ formatNumber(scope.row.sharpe, 2) }}</template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </el-col>
            </el-row>
            <el-row :gutter="16" style="margin-top: 12px;">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">收益率分布（直方图）</h4></template>
                  <div ref="wfHistReturn" style="height: 280px;"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">胜率分布（直方图）</h4></template>
                  <div ref="wfHistWinRate" style="height: 280px;"></div>
                </el-card>
              </el-col>
            </el-row>
            <el-row :gutter="16" style="margin-top: 12px;">
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">盈亏比分布（直方图）</h4></template>
                  <div ref="wfHistProfitFactor" style="height: 280px;"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header><h4 style="margin: 0;">最大回撤分布（直方图）</h4></template>
                  <div ref="wfHistMdd" style="height: 280px;"></div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

      <!-- 稳健性分析（仅 normal 模式） -->
      <el-tab-pane v-if="isNormalMode()" label="稳健性" name="robustness">
        <div class="tab-content">
          <el-row :gutter="16" style="margin-bottom: 8px;">
            <el-col :span="24">
              <el-card>
                <template #header><h4 style="margin: 0;">汇总统计（按窗口聚合）</h4></template>
                <div class="stats-grid">
                  <div class="stats-block">
                    <div class="stats-title">夏普</div>
                    <div class="stats-row">均值：{{ formatNumber(summaryStats.sharpe.mean, 3) }}</div>
                    <div class="stats-row">中位：{{ formatNumber(summaryStats.sharpe.median, 3) }}</div>
                    <div class="stats-row">标准差：{{ formatNumber(summaryStats.sharpe.std, 3) }}</div>
                    <div class="stats-row">最小/最大：{{ formatNumber(summaryStats.sharpe.min, 3) }} / {{ formatNumber(summaryStats.sharpe.max, 3) }}</div>
                  </div>
                  <div class="stats-block">
                    <div class="stats-title">区间收益</div>
                    <div class="stats-row">均值：{{ formatPercent(summaryStats.totalReturn.mean) }}</div>
                    <div class="stats-row">中位：{{ formatPercent(summaryStats.totalReturn.median) }}</div>
                    <div class="stats-row">标准差：{{ formatPercent(summaryStats.totalReturn.std) }}</div>
                    <div class="stats-row">最小/最大：{{ formatPercent(summaryStats.totalReturn.min) }} / {{ formatPercent(summaryStats.totalReturn.max) }}</div>
                  </div>
                  <div class="stats-block">
                    <div class="stats-title">最大回撤</div>
                    <div class="stats-row">均值：{{ formatPercent(Math.abs(summaryStats.mdd.mean || 0)) }}</div>
                    <div class="stats-row">中位：{{ formatPercent(Math.abs(summaryStats.mdd.median || 0)) }}</div>
                    <div class="stats-row">标准差：{{ formatPercent(summaryStats.mdd.std) }}</div>
                    <div class="stats-row">最小/最大：{{ formatPercent(Math.abs(summaryStats.mdd.min || 0)) }} / {{ formatPercent(Math.abs(summaryStats.mdd.max || 0)) }}</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-card>
                <template #header><h4 style="margin: 0;">按标的分布（夏普箱线图）</h4></template>
                <div ref="boxBySymbol" style="height: 320px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card>
                <template #header><h4 style="margin: 0;">按周期分布（夏普箱线图）</h4></template>
                <div ref="boxByTimeframe" style="height: 320px;"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="16" style="margin-top: 12px;">
            <el-col :span="12">
              <el-card>
                <template #header><h4 style="margin: 0;">夏普分布（直方图）</h4></template>
                <div ref="histSharpe" style="height: 280px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card>
                <template #header><h4 style="margin: 0;">风险-收益散点（年化 vs 最大回撤）</h4></template>
                <div ref="scatterRiskReturn" style="height: 280px;"></div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

        <!-- 配置 -->
        <el-tab-pane label="配置" name="config">
          <div class="tab-content">
          <pre style="background: #f5f7fa; padding: 16px; border-radius: 4px; max-height: 400px; overflow-y: auto; font-size: 13px;">{{ JSON.stringify(task.config, null, 2) }}</pre>
          </div>
        </el-tab-pane>
      
      <!-- 时间 -->
      <el-tab-pane label="时间" name="times">
        <div class="tab-content">
          <template v-if="timeSummaryAvailable">
            <el-row :gutter="16" style="margin-bottom: 5px;">
              <el-col :span="6">
                <div class="metric-card">
                  <div class="metric-title">总时间</div>
                  <div class="metric-value">{{ formatSecondsDisplay(times.total_time_sec) }}</div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="metric-card">
                  <div class="metric-title">执行时间</div>
                  <div class="metric-value">{{ formatSecondsDisplay(times.execution_time) }}</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="metric-card">
                  <div class="metric-title">窗口数</div>
                  <div class="metric-value">{{ times.window_count || (windows||[]).length || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="metric-card">
                  <div class="metric-title">并发数</div>
                  <div class="metric-value">{{ times.concurrency || task?.config?.max_workers || '-' }}</div>
                </div>
              </el-col>
            </el-row>

            <el-table :data="timeStageRows" border stripe size="small">
              <el-table-column label="阶段" prop="stage" min-width="140">
                <template #default="scope">{{ stageLabel(scope.row.stage) }}</template>
              </el-table-column>
              <el-table-column label="均值(秒)" prop="mean" min-width="120">
                <template #default="scope">{{ formatNumber(scope.row.mean, 3) }}</template>
              </el-table-column>
              <el-table-column label="P50(秒)" prop="median" min-width="120">
                <template #default="scope">{{ formatNumber(scope.row.median, 3) }}</template>
              </el-table-column>
              <el-table-column label="P95(秒)" prop="p95" min-width="120">
                <template #default="scope">{{ formatNumber(scope.row.p95, 3) }}</template>
              </el-table-column>
              <el-table-column label="P99(秒)" prop="p99" min-width="120">
                <template #default="scope">{{ formatNumber(scope.row.p99, 3) }}</template>
              </el-table-column>
            </el-table>
          </template>
          <template v-else>
            <div style="color:#909399;">暂无时间数据</div>
          </template>
        </div>
      </el-tab-pane>
      </el-tabs>
    </div>

  </el-dialog>
</template>

<script>
import { getEnhancedBacktestResults } from '@/api/backtest'
import * as echarts from 'echarts'
import { InfoFilled } from '@element-plus/icons-vue'

export default {
  name: 'ResultsDialog',
  props: {
    visible: { type: Boolean, default: false },
    taskId: { type: Number, default: null }
  },
  emits: ['update:visible'],
  data() {
    return {
      loading: false,
      activeTab: 'overview',
      task: {},
      metrics: {},
      windows: [],
      equityChart: null,
      drawdownChart: null,
      // ROBUSTNESS CHARTS
      boxBySymbolChart: null,
      boxByTimeframeChart: null,
      histSharpeChart: null,
      scatterRiskReturnChart: null,
      summaryStats: { sharpe: {}, totalReturn: {}, mdd: {} },
      // new state for normal mode
      combined: null,
      selectedSymbol: null,
      selectedTimeframe: null,
      heatmapMetric: 'sharpe_ratio',
      metricsGroupBy: 'symbol',
      pivotMetric: 'sharpe_ratio',
      selectedExtraColumns: [],  // 选中的额外列
      // WF state
      wfSharpeTimelineChart: null,
      wfHistSharpeChart: null,
      wfHistReturnChart: null,
      wfHistWinRateChart: null,
      wfHistProfitFactorChart: null,
      wfHistMddChart: null,
      wfStats: { total: 0, sharpe_median: 0, sharpe_p25: 0, mdd_median: 0, trades_median: 0 },
      wfAvgBySymbolTf: [],
      wfTimelineMetric: 'sharpe_ratio',
      wfRecommendation: null
    }
  },
  watch: {
    visible(val) {
      if (val && this.taskId) {
        this.loadData()
      }
    },
    activeTab(val) {
      if (val === 'overview') {
        this.$nextTick(() => {
          this.renderCharts()
        })
      } else if (val === 'robustness' && this.isNormalMode()) {
        this.$nextTick(() => {
          this.computeSummaryStats()
          this.renderRobustnessCharts()
        })
      } else if (val === 'wf_robustness' && this.isWFMode()) {
        this.$nextTick(() => {
          this.computeWFStats()
          this.renderWFCharts()
        })
      }
    }
  },
  computed: {
    metricsTableRows() {
      const t = this.buildMetricsTable()
      return t.rows || []
    },
    zeroTradeWindowsCount() {
      // 从summary中读取0交易窗口数量
      if (this.isNormalMode()) {
        return this.task?.summary?.normal?.zero_trade_windows_count || 0
      } else if (this.isWFMode()) {
        return this.task?.summary?.walk_forward?.zero_trade_windows_count || 0
      }
      return 0
    },
    metricsExtremes() {
      const rows = this.metricsTableRows || []
      const keys = ['total_return','max_drawdown','sharpe_ratio','total_trades','long_trades','short_trades','win_rate','long_win_rate','short_win_rate','profit_factor','avg_pnl','avg_pnl_long','avg_pnl_short','avg_return_per_trade','avg_return_long','avg_return_short','median_pnl_long','median_pnl_short','median_return_long','median_return_short','avg_win','avg_loss','avg_win_long','avg_loss_long','avg_win_short','avg_loss_short']
      const ext = {}
      for (const k of keys) {
        const vals = rows.map(r => {
          const v = Number(r[k] || 0)
          return k === 'max_drawdown' ? Math.abs(v || 0) : v
        }).filter(v => isFinite(v))
        if (vals.length) {
          ext[k] = { min: Math.min(...vals), max: Math.max(...vals) }
        } else {
          ext[k] = { min: 0, max: 0 }
        }
      }
      return ext
    },
    metricsSummaryRows() {
      const rows = this.metricsTableRows || []
      const allTotalReturn = rows.map(r => r.total_return)
      const allMdd = rows.map(r => r.max_drawdown)
      const allSharpe = rows.map(r => r.sharpe_ratio)
      const std = (list) => {
        if (!list.length) return 0
        const mean = list.reduce((a, b) => a + b, 0) / list.length
        const variance = list.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / list.length
        return Math.sqrt(variance)
      }
      const meanRow = {
        label: '均值',
        total_return: (allTotalReturn.reduce((a, b) => a + b, 0) / (allTotalReturn.length || 1)) || 0,
        max_drawdown: (allMdd.reduce((a, b) => a + b, 0) / (allMdd.length || 1)) || 0,
        sharpe_ratio: (allSharpe.reduce((a, b) => a + b, 0) / (allSharpe.length || 1)) || 0
      }
      const stdRow = {
        label: '标准差',
        total_return: std(allTotalReturn) || 0,
        max_drawdown: std(allMdd) || 0,
        sharpe_ratio: std(allSharpe) || 0
      }
      return [meanRow, stdRow]
    },
    pivotColumns() {
      const set = new Set((this.windows || []).map(w => w.timeframe || 'unknown'))
      return Array.from(set)
    },
    pivotRows() {
      const symbols = Array.from(new Set((this.windows || []).map(w => w.symbol || 'unknown')))
      const cols = this.pivotColumns
      const rows = symbols.map(sym => {
        const row = { symbol: sym }
        for (const tf of cols) row[tf] = undefined
        for (const w of this.windows || []) {
          if ((w.symbol || 'unknown') === sym) {
            const tf = w.timeframe || 'unknown'
            const m = w.metrics || w.test_metrics || {}
            row[tf] = Number(m[this.pivotMetric] || 0)
          }
        }
        return row
      })
      return rows
    },
    times() {
      try { return (this.task?.summary?.times) || {} } catch (e) { return {} }
    },
    timeSummaryAvailable() {
      const t = this.times || {}
      return !!(t && (t.total_time_sec || (t.stages && Object.keys(t.stages||{}).length>0)))
    },
    timeStageRows() {
      const t = this.times || {}
      const stages = t.stages || {}
      const order = ['init','get_data','skip_data','backtest','metrics','total']
      const rows = []
      for (const k of order) {
        if (!stages[k]) continue
        rows.push({ stage: k, ...stages[k] })
      }
      // append any other keys
      for (const k of Object.keys(stages)) {
        if (order.includes(k)) continue
        rows.push({ stage: k, ...stages[k] })
      }
      return rows
    }
  },
  methods: {
    stageLabel(key) {
      const map = {
        init: '初始化环境',
        get_data: '加载数据',
        skip_data: '越过前置数据',
        backtest: '回测执行',
        metrics: '指标聚合',
        total: '总计'
      }
      return map[key] || key
    },
    formatSecondsDisplay(sec) {
      const s = Number(sec)
      if (!Number.isFinite(s) || s < 0) return '-'
      if (s < 120) return `${s.toFixed(2)}s`
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const rs = Math.floor(s % 60)
      if (h > 0) return `${h}h ${m}m ${rs}s`
      return `${m}m ${rs}s`
    },
    calculateMedian(values) {
      if (!values || values.length === 0) return 0
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2
      }
      return sorted[mid]
    },
    buildMetricsTable() {
      const groupBy = this.metricsGroupBy
      const map = {}
      for (const w of this.windows || []) {
        const key = groupBy === 'symbol' ? (w.symbol || 'unknown') : (w.timeframe || 'unknown')
        if (!map[key]) map[key] = []
        const m = w.metrics || w.test_metrics || {}
        map[key].push({
          total_return: Number(m.total_return || 0),
          annual_return: Number(m.annual_return || 0),
          max_drawdown: Number(m.max_drawdown || 0),
          sharpe_ratio: Number(m.sharpe_ratio || 0),
          total_trades: Number(m.total_trades || 0),
          win_trades: Number(m.win_trades || 0),
          long_trades: Number(m.long_trades || 0),
          short_trades: Number(m.short_trades || 0),
          long_win_trades: Number(m.long_win_trades || 0),
          short_win_trades: Number(m.short_win_trades || 0),
          profit_factor: Number(m.profit_factor || 0),
          avg_win: Number(m.avg_win || 0),
          avg_loss: Number(m.avg_loss || 0),
          avg_win_long: Number(m.avg_win_long || 0),
          avg_loss_long: Number(m.avg_loss_long || 0),
          avg_win_short: Number(m.avg_win_short || 0),
          avg_loss_short: Number(m.avg_loss_short || 0),
          avg_pnl: Number(m.avg_pnl || 0),
          avg_pnl_long: Number(m.avg_pnl_long || 0),
          avg_pnl_short: Number(m.avg_pnl_short || 0),
          avg_return_per_trade: Number(m.avg_return_per_trade || 0),
          avg_return_long: Number(m.avg_return_long || 0),
          avg_return_short: Number(m.avg_return_short || 0),
        })
      }
      const rows = Object.keys(map).map(k => {
        const arr = map[k]
        const avg = (key) => arr.reduce((s, v) => s + (v[key] || 0), 0) / (arr.length || 1)
        const sum = (key) => arr.reduce((s, v) => s + (v[key] || 0), 0)

        const total_trades = sum('total_trades')
        const long_trades = sum('long_trades')
        const short_trades = sum('short_trades')
        const win_trades = sum('win_trades')
        const loss_trades = total_trades - win_trades  // 计算亏损交易次数
        const long_win_trades = sum('long_win_trades')
        const long_loss_trades = long_trades - long_win_trades  // 计算做多亏损交易次数
        const short_win_trades = sum('short_win_trades')
        const short_loss_trades = short_trades - short_win_trades  // 计算做空亏损交易次数

        const weighted = (valKey, weightKey, defaultDiv = 0) => {
          const numerator = arr.reduce((s, v) => s + (Number(v[valKey] || 0) * Number(v[weightKey] || 0)), 0)
          const denom = sum(weightKey)
          return denom ? (numerator / denom) : defaultDiv
        }

        const avg_pnl = weighted('avg_pnl', 'total_trades', 0)
        const avg_pnl_long = weighted('avg_pnl_long', 'long_trades', 0)
        const avg_pnl_short = weighted('avg_pnl_short', 'short_trades', 0)
        const avg_return_per_trade = weighted('avg_return_per_trade', 'total_trades', 0)
        const avg_return_long = weighted('avg_return_long', 'long_trades', 0)
        const avg_return_short = weighted('avg_return_short', 'short_trades', 0)
        
        // 先计算每个窗口的亏损交易次数（用于后续计算）
        const lossTradesByWindow = arr.map(v => (v.total_trades || 0) - (v.win_trades || 0))
        const longLossTradesByWindow = arr.map(v => (v.long_trades || 0) - (v.long_win_trades || 0))
        const shortLossTradesByWindow = arr.map(v => (v.short_trades || 0) - (v.short_win_trades || 0))
        
        // 平均利润和平均亏损：使用加权平均（按盈利/亏损交易次数加权）
        const avg_win = weighted('avg_win', 'win_trades', 0)
        const avg_loss = loss_trades > 0 ? arr.reduce((s, v, i) => s + (Number(v.avg_loss || 0) * lossTradesByWindow[i]), 0) / loss_trades : 0
        
        // 盈亏比：平均利润 / 平均亏损
        const profit_factor = avg_loss > 0 ? (avg_win / avg_loss) : (avg_win > 0 ? Infinity : 0)
        
        const avg_win_long = weighted('avg_win_long', 'long_win_trades', 0)
        const avg_loss_long = long_loss_trades > 0 ? arr.reduce((s, v, i) => s + (Number(v.avg_loss_long || 0) * longLossTradesByWindow[i]), 0) / long_loss_trades : 0
        const avg_win_short = weighted('avg_win_short', 'short_win_trades', 0)
        const avg_loss_short = short_loss_trades > 0 ? arr.reduce((s, v, i) => s + (Number(v.avg_loss_short || 0) * shortLossTradesByWindow[i]), 0) / short_loss_trades : 0
        
        // 中位数计算：收集每个窗口的对应平均值，然后计算中位数
        const median_pnl_long = this.calculateMedian(arr.map(v => v.avg_pnl_long).filter(v => isFinite(v) && v !== null && v !== undefined))
        const median_pnl_short = this.calculateMedian(arr.map(v => v.avg_pnl_short).filter(v => isFinite(v) && v !== null && v !== undefined))
        const median_return_long = this.calculateMedian(arr.map(v => v.avg_return_long).filter(v => isFinite(v) && v !== null && v !== undefined))
        const median_return_short = this.calculateMedian(arr.map(v => v.avg_return_short).filter(v => isFinite(v) && v !== null && v !== undefined))
        
        return {
          group: k,
          // 收益率和比率类指标：使用简单平均（因为它们是百分比/比率，不依赖于交易次数）
          total_return: avg('total_return'),
          annual_return: avg('annual_return'),
          max_drawdown: avg('max_drawdown'),
          sharpe_ratio: avg('sharpe_ratio'),
          // 交易次数：求和
          total_trades,
          long_trades,
          short_trades,
          // 胜率：重新计算（盈利交易数 / 总交易数）
          win_rate: total_trades ? (win_trades / total_trades) : 0,
          long_win_rate: long_trades ? (long_win_trades / long_trades) : 0,
          short_win_rate: short_trades ? (short_win_trades / short_trades) : 0,
          // 盈亏比：平均利润 / 平均亏损
          profit_factor,
          // 平均利润和平均亏损：加权平均（按盈利/亏损交易次数加权）
          avg_win,
          avg_loss,
          avg_win_long,
          avg_loss_long,
          avg_win_short,
          avg_loss_short,
          // 平均收益：加权平均（按交易次数加权）
          avg_pnl,
          avg_pnl_long,
          avg_pnl_short,
          avg_return_per_trade,
          avg_return_long,
          avg_return_short,
          // 中位数：收集各窗口的平均值后计算中位数
          median_pnl_long,
          median_pnl_short,
          median_return_long,
          median_return_short,
        }
      })
      const allTotalReturn = rows.map(r => r.total_return)
      const allMdd = rows.map(r => r.max_drawdown)
      const allSharpe = rows.map(r => r.sharpe_ratio)
      const std = (list) => {
        if (!list.length) return 0
        const mean = list.reduce((a, b) => a + b, 0) / list.length
        const variance = list.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / list.length
        return Math.sqrt(variance)
      }
      const meanRow = {
        label: '均值',
        total_return: (allTotalReturn.reduce((a, b) => a + b, 0) / (allTotalReturn.length || 1)) || 0,
        max_drawdown: (allMdd.reduce((a, b) => a + b, 0) / (allMdd.length || 1)) || 0,
        sharpe_ratio: (allSharpe.reduce((a, b) => a + b, 0) / (allSharpe.length || 1)) || 0
      }
      const stdRow = {
        label: '标准差',
        total_return: std(allTotalReturn) || 0,
        max_drawdown: std(allMdd) || 0,
        sharpe_ratio: std(allSharpe) || 0
      }
      return { rows, summary: [meanRow, stdRow] }
    },
    async loadData() {
      this.loading = true
      try {
        const { data } = await getEnhancedBacktestResults(this.taskId)
        this.task = data
        this.metrics = (data && data.summary && data.summary.walk_forward && data.summary.walk_forward.aggregated_metrics) ? data.summary.walk_forward.aggregated_metrics : (data.metrics || {})
        this.windows = data.windows || []
        this.combined = data.combined || null
        // WFA recommendation (prefer summary, fallback to artifacts)
        const recFromArtifacts = data?.artifacts?.walk_forward?.recommendation
        this.wfRecommendation = recFromArtifacts || null
        // default selection for normal mode
        if (this.windows && this.windows.length > 0) {
          const w0 = this.windows[0]
          this.selectedSymbol = w0.symbol
          this.selectedTimeframe = w0.timeframe
        }
        if (data.status === 'completed') {
          this.$nextTick(() => {
            this.renderCharts()
            if (this.isWFMode()) {
              this.computeWFStats()
            }
          })
        }
      } catch (error) {
        console.error('加载回测结果失败:', error)
        this.$message.error('加载回测结果失败')
      } finally {
        this.loading = false
      }
    },
    isWFMode() {
      try { return this.task?.type === 'walk_forward' || this.task?.config?.mode === 'walk_forward' } catch(e) { return false }
    },
    copyToClipboard(text) {
      try {
        navigator.clipboard.writeText(text)
        this.$message.success('已复制')
      } catch (e) {
        this.$message.error('复制失败')
      }
    },
    _canonKey(obj) {
      try { return JSON.stringify(obj || {}, Object.keys(obj || {}).sort()) } catch (e) { return JSON.stringify(obj || {}) }
    },
    wfRowClassName({ row }) {
      try {
        if (!this.wfRecommendation || !this.wfRecommendation.recommended_params) return ''
        const a = this._canonKey(row?.best_params || {})
        const b = this._canonKey(this.wfRecommendation.recommended_params || {})
        return a === b ? 'wf-reco-row' : ''
      } catch (e) { return '' }
    },
    
    renderCharts() {
      this.renderEquityChart()
      this.renderDrawdownChart()
    },

    // WF charts
    renderWFCharts() {
      // Timeline: multiple metrics selectable
      const win = (this.windows||[])
      const buildSeq = (key) => {
        const raw = win.map(w => Number((w.test_metrics||w.metrics||{})[key] || 0))
        return key === 'win_rate' ? raw.map(v => v * 100) : raw
      }
      const colors = { sharpe_ratio:'#5470c6', calmar_ratio:'#91cc75', sortino_ratio:'#fac858', profit_factor:'#ee6666', win_rate:'#73c0de' }
      const curKey = this.wfTimelineMetric
      const series = [{ name: curKey, type: 'line', data: buildSeq(curKey), smooth: true, showSymbol: false, lineStyle: { width: 2, color: colors[curKey] || undefined } }]
      const yNameMap = { sharpe_ratio:'Sharpe', calmar_ratio:'Calmar', sortino_ratio:'Sortino', profit_factor:'盈亏比', win_rate:'胜率(%)' }
      if (this.wfSharpeTimelineChart) this.wfSharpeTimelineChart.dispose()
      this.wfSharpeTimelineChart = echarts.init(this.$refs.wfSharpeTimeline)
      this.wfSharpeTimelineChart.setOption({
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: (this.windows||[]).map((_,i)=>`W${i+1}`) },
        yAxis: { type: 'value', name: yNameMap[curKey] || '指标' },
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        series
      })

      // Histogram of sharpe
      const list = buildSeq('sharpe_ratio').filter(v=>isFinite(v))
      if (this.wfHistSharpeChart) this.wfHistSharpeChart.dispose()
      this.wfHistSharpeChart = echarts.init(this.$refs.wfHistSharpe)
      this.wfHistSharpeChart.setOption(this.buildHistogramOption(list, 'Sharpe'))

      // Histogram of returns (total_return)
      const retList = (this.windows||[]).map(w => Number((w.test_metrics||w.metrics||{}).total_return || 0)).filter(v=>isFinite(v))
      if (this.wfHistReturnChart) this.wfHistReturnChart.dispose()
      this.wfHistReturnChart = echarts.init(this.$refs.wfHistReturn)
      this.wfHistReturnChart.setOption(this.buildHistogramOption(retList, '收益率'))

      // Histogram of win_rate
      const winList = (this.windows||[]).map(w => Number((w.test_metrics||w.metrics||{}).win_rate || 0) * 100).filter(v=>isFinite(v))
      if (this.wfHistWinRateChart) this.wfHistWinRateChart.dispose()
      this.wfHistWinRateChart = echarts.init(this.$refs.wfHistWinRate)
      this.wfHistWinRateChart.setOption(this.buildHistogramOption(winList, '胜率'))

      // Histogram of profit_factor
      const pfList = (this.windows||[]).map(w => Number((w.test_metrics||w.metrics||{}).profit_factor || 0)).filter(v=>isFinite(v))
      if (this.wfHistProfitFactorChart) this.wfHistProfitFactorChart.dispose()
      this.wfHistProfitFactorChart = echarts.init(this.$refs.wfHistProfitFactor)
      this.wfHistProfitFactorChart.setOption(this.buildHistogramOption(pfList, '盈亏比'))

      // Histogram of max_drawdown (use abs for positive axis)
      const mddList = (this.windows||[]).map(w => Math.abs(Number((w.test_metrics||w.metrics||{}).max_drawdown || 0))).filter(v=>isFinite(v))
      if (this.wfHistMddChart) this.wfHistMddChart.dispose()
      this.wfHistMddChart = echarts.init(this.$refs.wfHistMdd)
      this.wfHistMddChart.setOption(this.buildHistogramOption(mddList, '最大回撤'))
    },
    onWFTimelineMetricChange() {
      // 立即重绘
      this.$nextTick(() => {
        this.renderWFCharts()
      })
    },

    renderRobustnessCharts() {
      const { bySymbol, byTimeframe, sharpeList, riskReturn } = this.extractRobustnessData()
      // Box by symbol
      if (this.boxBySymbolChart) this.boxBySymbolChart.dispose()
      this.boxBySymbolChart = echarts.init(this.$refs.boxBySymbol)
      this.boxBySymbolChart.setOption(this.buildBoxplotOption(bySymbol))
      // Box by timeframe
      if (this.boxByTimeframeChart) this.boxByTimeframeChart.dispose()
      this.boxByTimeframeChart = echarts.init(this.$refs.boxByTimeframe)
      this.boxByTimeframeChart.setOption(this.buildBoxplotOption(byTimeframe))
      // Histogram Sharpe
      if (this.histSharpeChart) this.histSharpeChart.dispose()
      this.histSharpeChart = echarts.init(this.$refs.histSharpe)
      this.histSharpeChart.setOption(this.buildHistogramOption(sharpeList, '夏普'))
      // Scatter risk-return
      if (this.scatterRiskReturnChart) this.scatterRiskReturnChart.dispose()
      this.scatterRiskReturnChart = echarts.init(this.$refs.scatterRiskReturn)
      this.scatterRiskReturnChart.setOption(this.buildScatterOption(riskReturn))
    },

    extractRobustnessData() {
      // Collect per-window sharpe/annual/mdd by symbol/timeframe
      const bySymbol = {}
      const byTimeframe = {}
      const sharpeList = []
      const riskReturn = [] // [annual, abs(mdd), symbol, timeframe]
      for (const w of this.windows || []) {
        const m = w.metrics || w.test_metrics || {}
        const symbol = w.symbol || 'unknown'
        const tf = w.timeframe || 'unknown'
        if (!bySymbol[symbol]) bySymbol[symbol] = []
        if (!byTimeframe[tf]) byTimeframe[tf] = []
        const sharpe = Number(m.sharpe_ratio || 0)
        const totalReturn = Number(m.total_return || 0)
        const mdd = Number(m.max_drawdown || 0)
        bySymbol[symbol].push(sharpe)
        byTimeframe[tf].push(sharpe)
        sharpeList.push(sharpe)
        riskReturn.push([totalReturn, Math.abs(mdd), symbol, tf])
      }
      return { bySymbol, byTimeframe, sharpeList, riskReturn }
    },

    computeSummaryStats() {
      const listSharpe = []
      const listTotalReturn = []
      const listMdd = []
      for (const w of this.windows || []) {
        const m = w.metrics || w.test_metrics || {}
        listSharpe.push(Number(m.sharpe_ratio || 0))
        listTotalReturn.push(Number(m.total_return || 0))
        listMdd.push(Number(m.max_drawdown || 0))
      }
      this.summaryStats = {
        sharpe: this.calcStats(listSharpe),
        totalReturn: this.calcStats(listTotalReturn),
        mdd: this.calcStats(listMdd)
      }
    },

    computeWFStats() {
      const arrSharpe = []
      const arrMdd = []
      const arrTrades = []
      const byPair = {}
      for (const w of this.windows || []) {
        const m = w.test_metrics || w.metrics || {}
        const s = Number(m.sharpe_ratio || 0)
        const d = Number(m.max_drawdown || 0)
        const t = Number(m.total_trades || 0)
        arrSharpe.push(s)
        arrMdd.push(d)
        arrTrades.push(t)
        const key = `${w.symbol||'unknown'}|${w.timeframe||'unknown'}`
        if (!byPair[key]) byPair[key] = { sharpe: [], symbol: w.symbol||'unknown', timeframe: w.timeframe||'unknown' }
        byPair[key].sharpe.push(s)
      }
      const stats = (xs)=>{
        const a = xs.filter(v=>isFinite(v)).sort((x,y)=>x-y)
        const n = a.length
        const median = n? (n%2? a[(n-1)/2] : (a[n/2-1]+a[n/2])/2) : 0
        const p25 = n? a[Math.max(0, Math.floor(n*0.25)-1)] : 0
        const medTrades = (()=>{ const b=arrTrades.slice().sort((x,y)=>x-y); const nb=b.length; return nb? (nb%2? b[(nb-1)/2] : (b[nb/2-1]+b[nb/2])/2) : 0 })()
        const medMdd = (()=>{ const b=arrMdd.slice().sort((x,y)=>x-y); const nb=b.length; return nb? (nb%2? b[(nb-1)/2] : (b[nb/2-1]+b[nb/2])/2) : 0 })()
        return { median, p25, medMdd, medTrades }
      }
      const s = stats(arrSharpe)
      this.wfStats = { total: (this.windows||[]).length, sharpe_median: s.median, sharpe_p25: s.p25, mdd_median: s.medMdd, trades_median: Math.round(s.medTrades) }

      // avg by symbol×timeframe
      const rows = []
      for (const key of Object.keys(byPair)) {
        const p = byPair[key]
        const avg = p.sharpe.length? p.sharpe.reduce((a,b)=>a+b,0)/p.sharpe.length : 0
        rows.push({ symbol: p.symbol, timeframe: p.timeframe, sharpe: avg })
      }
      this.wfAvgBySymbolTf = rows
    },

    calcStats(list) {
      const arr = (list || []).filter(v => isFinite(v))
      if (!arr.length) return { mean: 0, median: 0, std: 0, min: 0, max: 0 }
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length
      const std = Math.sqrt(variance)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      return { mean, median, std, min, max }
    },

    buildBoxplotOption(groupMap) {
      const categories = Object.keys(groupMap || {})
      const seriesData = categories.map(k => this.calcBox(groupMap[k]))
      return {
        tooltip: { trigger: 'item' },
        grid: { left: 40, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value', name: '夏普' },
        series: [{
          name: '箱线', type: 'boxplot', data: seriesData
        }]
      }
    },

    calcBox(list) {
      const arr = (list || []).filter(v => isFinite(v)).sort((a, b) => a - b)
      if (!arr.length) return [0, 0, 0, 0, 0]
      const q1 = this.quantile(arr, 0.25)
      const q2 = this.quantile(arr, 0.5)
      const q3 = this.quantile(arr, 0.75)
      const min = arr[0]
      const max = arr[arr.length - 1]
      return [min, q1, q2, q3, max]
    },

    quantile(arr, q) {
      const pos = (arr.length - 1) * q
      const base = Math.floor(pos)
      const rest = pos - base
      if (arr[base + 1] !== undefined) return arr[base] + rest * (arr[base + 1] - arr[base])
      return arr[base]
    },

    buildHistogramOption(list, label) {
      const arr = (list || []).filter(v => isFinite(v))
      if (!arr.length) return { series: [] }
      const bins = 12
      const min = Math.min(...arr)
      const max = Math.max(...arr)
      const step = (max - min) / bins || 1
      const counts = new Array(bins).fill(0)
      for (const v of arr) {
        let idx = Math.floor((v - min) / step)
        if (idx >= bins) idx = bins - 1
        if (idx < 0) idx = 0
        counts[idx] += 1
      }
      const x = new Array(bins).fill(0).map((_, i) => (min + i * step).toFixed(2))
      return {
        grid: { left: 40, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: x, name: label },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: counts, itemStyle: { color: '#73c0de' } }]
      }
    },

    buildScatterOption(points) {
      // points: [annual, abs(mdd), symbol, timeframe]
      return {
        tooltip: { formatter: (p) => {
          const d = p.data
          return `${d[2]} / ${d[3]}<br/>区间收益: ${this.formatPercent(d[0])}<br/>最大回撤: ${this.formatPercent(d[1])}`
        }},
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'value', name: '区间收益', axisLabel: { formatter: (v) => `${(v*100).toFixed(0)}%` } },
        yAxis: { type: 'value', name: '最大回撤', axisLabel: { formatter: (v) => `${(v*100).toFixed(0)}%` } },
        series: [{
          type: 'scatter', data: points || [], symbolSize: 8, itemStyle: { color: '#5470c6' }
        }]
      }
    },
    
    renderEquityChart() {
      // for normal: prefer selected window; else fallback to first
      const target = this.getSelectedWindow() || this.windows?.[0]
      if (!this.$refs.equityChart || !target?.equity_values) return
      
      if (this.equityChart) {
        this.equityChart.dispose()
      }
      
      this.equityChart = echarts.init(this.$refs.equityChart)
      const series = [{
        name: '策略净值',
        type: 'line',
        data: target.equity_values || [],
        smooth: true,
        lineStyle: { color: '#5470c6', width: 2 },
        showSymbol: false
      }]
      // add combined series for normal mode
      if (this.isNormalMode() && this.combined?.equity_values?.length) {
        series.push({
          name: '组合净值',
          type: 'line',
          data: this.combined.equity_values,
          smooth: true,
          lineStyle: { color: '#333', width: 1.5, type: 'dashed' },
          showSymbol: false
        })
      }
      if (target.benchmark_curve && target.benchmark_curve.length > 0) {
        series.push({
          name: '基准曲线',
          type: 'line',
          data: target.benchmark_curve,
          smooth: true,
          lineStyle: { color: '#91cc75', width: 2, type: 'dashed' },
          showSymbol: false
        })
      }
      const xTimes = (target.equity_times || []).map(t => new Date(t).toLocaleDateString())
      const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), top: 10 },
        grid: { left: 60, right: 20, top: 50, bottom: 40 },
        xAxis: { type: 'category', data: xTimes },
        yAxis: { type: 'value', name: '净值' },
        dataZoom: [{ type: 'inside', zoomOnMouseWheel: 'ctrl', zoomLock: true }],
        series
      }
      
      this.equityChart.setOption(option)
    },
    
    renderDrawdownChart() {
      const target = this.getSelectedWindow() || this.windows?.[0]
      if (!this.$refs.drawdownChart || !target?.drawdown_curve) return
      
      if (this.drawdownChart) {
        this.drawdownChart.dispose()
      }
      
      this.drawdownChart = echarts.init(this.$refs.drawdownChart)
      const option = {
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: (target.equity_times || []).map(t => new Date(t).toLocaleDateString()) },
        yAxis: { type: 'value', max: 0 },
        dataZoom: [{ type: 'inside', zoomOnMouseWheel: 'ctrl', zoomLock: true }],
        series: [{ name: '回撤', type: 'line', data: target.drawdown_curve || [], smooth: true, lineStyle: { color: '#ee6666', width: 2 }, areaStyle: { color: 'rgba(238, 102, 102, 0.3)' }, showSymbol: false }]
      }
      
      this.drawdownChart.setOption(option)
    },
    
    formatNumber(num, decimals = 2) {
      if (num === undefined || num === null || !isFinite(num)) return '-'
      return Number(num).toFixed(decimals)
    },
    
    formatPercent(value) {
      if (value === undefined || value === null || !isFinite(value)) return '-'
      return (Number(value) * 100).toFixed(2) + '%'
    },
    formatStatisticalSignificance(pvalue) {
      if (pvalue === undefined || pvalue === null || !isFinite(pvalue)) return '-'
      // 检测是否为默认值（数据不足的情况）
      if (pvalue === 1.0 && (this.metrics.t_statistic === undefined || this.metrics.t_statistic === 0.0)) {
        return '数据不足'
      }
      if (pvalue < 0.001) return '极显著 (p<0.001)'
      if (pvalue < 0.01) return '高度显著 (p<0.01)'
      if (pvalue < 0.05) return '显著 (p<0.05)'
      if (pvalue < 0.1) return '边际显著 (p<0.1)'
      return `不显著 (p=${pvalue.toFixed(3)})`
    },
    getStatisticalSignificanceStyle(pvalue) {
      if (pvalue === undefined || pvalue === null || !isFinite(pvalue)) return {}
      // 检测是否为默认值（数据不足的情况）
      if (pvalue === 1.0 && (this.metrics.t_statistic === undefined || this.metrics.t_statistic === 0.0)) {
        return { color: '#909399' } // 灰色：数据不足
      }
      if (pvalue < 0.05) return { color: '#67c23a' } // 绿色：显著
      if (pvalue < 0.1) return { color: '#e6a23c' } // 黄色：边际显著
      return { color: '#f56c6c' } // 红色：不显著
    },
    displayWithMarker(key, value, type = 'number', decimals = 2) {
      const ext = this.metricsExtremes[key] || { min: null, max: null }
      let v = Number(value || 0)
      // 使用展示口径
      if (key === 'max_drawdown') v = Math.abs(v || 0)
      const marker = (isFinite(v) && ext) ? (Math.abs(v - ext.max) < 1e-12 ? ' ↑' : Math.abs(v - ext.min) < 1e-12 ? ' ↓' : '') : ''
      if (type === 'percent') return this.formatPercent(v) + marker
      if (type === 'mdd') return this.formatPercent(v) + marker
      return this.formatNumber(v, decimals) + marker
    },
    
    getTrendClass(value) {
      if (value === undefined || value === null || !isFinite(value)) return ''
      return value > 0 ? 'text-success' : value < 0 ? 'text-danger' : ''
    },
    
    getTrendStyle(value) {
      if (value === undefined || value === null || !isFinite(value)) return {}
      return { color: value > 0 ? '#67c23a' : value < 0 ? '#f56c6c' : '#606266' }
    },
    
    getStatusType(status) {
      const map = {
        'running': 'warning',
        'completed': 'success',
        'failed': 'danger',
        'cancelled': 'info'
      }
      return map[status] || 'info'
    },
    
    getStatusText(status) {
      const map = {
        'pending': '排队中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败',
        'cancelled': '已取消'
      }
      return map[status] || status
    },
    isNormalMode() {
      try {
        return (this.task?.config?.mode === 'normal') || (this.windows?.length > 1)
      } catch (e) { return false }
    },
    getSelectedWindow() {
      if (!this.isNormalMode()) return this.windows?.[0]
      if (!this.selectedSymbol || !this.selectedTimeframe) return this.windows?.[0]
      return this.windows.find(w => w.symbol === this.selectedSymbol && w.timeframe === this.selectedTimeframe) || this.windows?.[0]
    },
    
    displayPivot(v) {
      if (v === undefined || v === null || !isFinite(v)) return '-'
      if (this.pivotMetric === 'sharpe_ratio') return this.formatNumber(v, 2)
      if (this.pivotMetric === 'total_return') return this.formatPercent(v)
      if (this.pivotMetric === 'max_drawdown') return this.formatPercent(Math.abs(v||0))
      if (this.pivotMetric === 'win_rate') return this.formatPercent(v)
      return this.formatNumber(v, 2)
    },
    // Pivot builders
    pivotColumns() {
      const set = new Set((this.windows||[]).map(w => w.timeframe || 'unknown'))
      return Array.from(set)
    },
    pivotRows() {
      const symbols = Array.from(new Set((this.windows||[]).map(w => w.symbol || 'unknown')))
      const cols = this.pivotColumns()
      const rows = symbols.map(sym => {
        const row = { symbol: sym }
        for (const tf of cols) row[tf] = undefined
        for (const w of this.windows || []) {
          if ((w.symbol||'unknown') === sym) {
            const tf = w.timeframe || 'unknown'
            const m = w.metrics || w.test_metrics || {}
            row[tf] = Number(m[this.pivotMetric] || 0)
          }
        }
        return row
      })
      return rows
    }
  },
  beforeUnmount() {
    if (this.equityChart) {
      this.equityChart.dispose()
    }
    if (this.drawdownChart) {
      this.drawdownChart.dispose()
    }
    if (this.boxBySymbolChart) this.boxBySymbolChart.dispose()
    if (this.boxByTimeframeChart) this.boxByTimeframeChart.dispose()
    if (this.histSharpeChart) this.histSharpeChart.dispose()
    if (this.scatterRiskReturnChart) this.scatterRiskReturnChart.dispose()
  }
}
</script>

<style scoped>
.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

:deep(.el-statistic__head) {
  font-size: 13px;
}

:deep(.el-statistic__content) {
  font-size: 20px;
}

:deep(.el-card) {
  margin-bottom: 0;
}

:deep(.el-descriptions) {
  margin-top: 0;
}

.label-q {
  margin-left: 4px;
  color: #909399;
  cursor: help;
  font-size: 12px;
}

.label-q:hover {
  color: #409eff;
}

.metric-card {
  text-align: center;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 10px;
}

.metric-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  line-height: 1.4;
}

.metric-value {
  font-size: 20px;
  font-weight: 500;
  color: #303133;
  line-height: 1.2;
}

.dialog-content {
  height: calc(90vh - 70px); /* 减去header和footer的高度 */
  overflow: hidden;
}

.results-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.results-tabs .el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}


:deep(.results-tabs .el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stats-block {
  background: #fff;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #ebeef5;
}

.stats-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.stats-row {
  color: #606266;
  font-size: 13px;
  line-height: 20px;
}

.wf-reco-row td {
  background-color: #f0f9eb !important;
}
</style>

