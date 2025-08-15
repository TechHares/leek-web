<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="新建回测"
    width="1000px"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" class="create-form">
      <el-divider content-position="left">基本信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入回测名称" @input="onNameInput" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="可选" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">设置</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item prop="data_config_id">
            <template #label>
              数据配置
              <el-tooltip placement="top" content="数据源模板：包含市场、计价币、产品类型、默认标的/周期及数据源连接参数。选择后可自动填充下方标的与周期。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.data_config_id" placeholder="请选择数据配置" filterable @change="onDataConfigChange">
              <el-option v-for="c in dataConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <div class="mini-summary" v-if="selectedDataCfg">
              市场：{{ selectedDataSummary.market || '-' }} ｜ 计价币：{{ selectedDataSummary.quote_currency || '-' }} ｜ 产品：{{ insTypeOptions[selectedDataSummary.ins_type] || '-' }}
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="cost_config_id">
            <template #label>
              费用配置
              <el-tooltip placement="top" content="回测执行器模板：包含手续费、滑点与撮合细节等参数。此处选择的默认值可被下方‘账户/执行覆盖’覆写。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.cost_config_id" placeholder="请选择费用配置" filterable>
              <el-option v-for="c in costConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <div class="mini-summary" v-if="selectedCostCfg">
              执行器：{{ (selectedCostCfg.class_name || '').split('.').pop() }} ｜ 手续费：{{ selectedCostSummary.fee_rate ?? '-' }} ｜ 滑点(bps)：{{ selectedCostSummary.slippage_bps ?? '-' }}
            </div>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item prop="symbols">
            <template #label>
              标的
              <el-tooltip placement="top" content="可从数据配置自动带出，亦可覆盖。例如：BTC、ETH">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.symbols" multiple filterable allow-create default-first-option placeholder="输入后回车添加">
              <el-option v-for="s in form.symbols" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="timeframes">
            <template #label>
              时间周期
              <el-tooltip placement="top" content="可从数据配置自动带出，亦可覆盖。例如：M5、H1、D1">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.timeframes" multiple placeholder="请选择时间周期">
              <el-option v-for="tf in timeframeOptions" :key="tf.value" :label="tf.label" :value="tf.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">回测时间段</el-divider>
      <el-form-item prop="date_range">
        <template #label>
          周期
          <el-tooltip placement="top" content="训练/测试窗口将在此区间内滚动生成">
            <el-icon class="label-q"><InfoFilled /></el-icon>
          </el-tooltip>
        </template>
        <el-date-picker
          v-model="form.date_range"
          type="daterange"
          :shortcuts="dateShortcuts()"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 420px;"
        />
        <template #extra>
          预估窗口数：{{ windowCount }}
        </template>
      </el-form-item>

      <el-divider content-position="left">策略与寻优</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item prop="strategy_class">
            <template #label>
              策略
              <el-tooltip placement="top" content="从已注册策略中选择要回测的策略类。选择后会加载该策略的参数定义，并据此生成固定参数或参数空间。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.strategy_class" placeholder="请选择策略" filterable @change="handleStrategyTemplateChange">
              <el-option v-for="tpl in strategyTemplates" :key="tpl.cls" :label="tpl.name" :value="tpl.cls" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item>
            <template #label>
              启用寻优
              <el-tooltip placement="top" content="开启：按参数空间做WF选择；关闭：按固定参数回测（也可仅填固定值）">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-switch v-model="form.enable_optim" @change="onEnableOptimToggle" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item v-if="!form.enable_optim" label="策略参数">
        <div class="param-scroll-area">
          <DynamicForm
            v-if="selectedStrategyTemplate && Array.isArray(selectedStrategyTemplate.parameters) && selectedStrategyTemplate.parameters.length > 0 && form.strategy_class"
            :fields="selectedStrategyTemplate.parameters"
            v-model:modelValue="form.params"
            :key="strategyParamFormKey"
          />
          <div v-else style="color: #b0b3b8;">无需参数</div>
        </div>
      </el-form-item>

      <el-form-item label="参数空间" v-if="form.enable_optim">
        <div class="param-space">
          <div v-for="(row, idx) in form.param_items" :key="idx" class="param-row">
            <el-input :model-value="getParamLabel(row.name)" disabled style="width: 200px;" />
            <el-select v-model="row.mode" style="width: 120px; margin-left: 8px;">
              <el-option label="固定值" value="value" />
              <el-option label="范围" value="range" />
              <el-option label="枚举" value="choices" />
            </el-select>
            <template v-if="row.mode === 'value'">
              <el-input v-model="row.value" placeholder="值" style="width: 200px; margin-left: 8px;" />
            </template>
            <template v-else-if="row.mode === 'range'">
              <el-input v-model="row.min" placeholder="最小" style="width: 120px; margin-left: 8px;" />
              <el-input v-model="row.max" placeholder="最大" style="width: 120px; margin-left: 8px;" />
              <el-input v-model="row.step" placeholder="步长" style="width: 120px; margin-left: 8px;" />
            </template>
            <template v-else>
              <el-select v-model="row.choices" multiple filterable allow-create default-first-option placeholder="输入后回车添加" style="width: 360px; margin-left: 8px;" />
            </template>
          </div>
        </div>
        <div class="mini-summary" style="margin-top:8px;">
          参数组合：{{ paramComboCount }} ｜ 训练窗口：{{ windowCount }} ｜ 符号×周期：{{ symbolTfCount }} ｜ CV：{{ cvFactor }}
          <el-tag :type="riskTagType" size="small" style="margin-left:8px;">预估评估数量：{{ totalTrainJobs }}</el-tag>
        </div>
      </el-form-item>

      <el-divider content-position="left">稳健性阈值</el-divider>
      <div class="mini-summary" style="margin: -8px 0 8px 0; display:flex; align-items:center;">
        <span style="margin-right:8px;">快捷设置：</span>
        <el-radio-group v-model="thresholdPreset" size="small" @change="onThresholdPresetChange">
          <el-radio-button label="loose">宽松</el-radio-button>
          <el-radio-button label="standard">标准</el-radio-button>
          <el-radio-button label="strict">严格</el-radio-button>
        </el-radio-group>
      </div>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-form-item>
            <template #label>
              Sharpe中位数
              <el-tooltip placement="top" content="筛选标准：所有窗口按 (symbol,timeframe) 聚合后的夏普比率的中位数下限。建议≥1.0，过低说明稳定性不足。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.sharpe_median_min" :min="-10" :max="10" :step="0.1" :controls="false" :precision="2" />
            <template #extra>例如 1.0</template>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item>
            <template #label>
              Sharpe P25
              <el-tooltip placement="top" content="稳健性底线：夏普分布的第25分位下限。用于避免靠极少数窗口拉高均值。建议≥0.5。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.sharpe_p25_min" :min="-10" :max="10" :step="0.1" :controls="false" :precision="2" />
            <template #extra>例如 0.5</template>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item>
            <template #label>
              最大回撤上限
              <el-tooltip placement="top" content="风险约束：最大回撤(绝对值)的中位数上限。填写百分数，例如 20 代表 20%。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input v-model.number="mddPercent" type="number" class="percent-input" />
            <template #extra>例如 20 表示 20%</template>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item>
            <template #label>
              最小成交数
              <el-tooltip placement="top" content="流动性约束：每个训练/测试窗口至少需要出现的成交次数。避免由于样本稀疏造成的虚高指标。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.min_trades_per_window" :min="0" :controls="false" />
            <template #extra>例如 20</template>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">Walk-Forward 设置</el-divider>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item prop="train_days">
            <template #label>
              训练天数
              <el-tooltip placement="top" content="每个训练窗口包含的自然日数。结合周期与数据覆盖自动计算窗口数量。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.train_days" :min="0" :controls="false" :disabled="!form.enable_optim" />
            <template #extra v-if="!form.enable_optim">未启用寻优时，训练天数固定为 0</template>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item prop="test_days">
            <template #label>
              测试天数
              <el-tooltip placement="top" content="每个测试窗口包含的自然日数。训练完成后，相邻的测试窗口按该天数滚动前进。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.test_days" :min="1" :controls="false" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item>
            <template #label>
              隔离天数
              <el-tooltip placement="top" content="训练与测试之间的冷却/隔离天数，用于避免信息泄露。通常 M5/M15=1，H1/H4=1~3，D1≈5。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.embargo_days" :min="0" :controls="false" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item>
            <template #label>
              模式
              <el-tooltip placement="top" content="滚动：固定窗长前移；扩展：训练集从开始累积扩展">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.mode">
              <el-option label="滚动" value="rolling" />
              <el-option label="扩展" value="expanding" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item>
            <template #label>
              CV折数
              <el-tooltip placement="top" content="训练窗口内部交叉验证折数（0/1 表示不做CV）">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.cv_splits" :min="0" :controls="false" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item>
            <template #label>
              并发
              <el-tooltip placement="top" content="并发度（后续可做符号/窗口级并行）">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.max_workers" :min="1" :controls="false" />
          </el-form-item>
        </el-col>
      </el-row>

      
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-tooltip v-if="windowCount <= 0 && !allowTestOnly" content="训练/测试/隔离设置导致窗口数为 0，请调整区间或天数" placement="top">
          <el-button type="primary" :disabled="windowCount <= 0 && !allowTestOnly" @click="onConfirm">确定</el-button>
        </el-tooltip>
        <el-button v-else type="primary" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { listBacktestConfigs, createWalkForwardTask } from '@/api/backtest'
import { getStrategyTemplates } from '@/api/strategy'
import DynamicForm from '@/components/DynamicForm.vue'
import { TradeInsType, insTypeDesc } from '@/utils/enum'
import { QuestionFilled, InfoFilled } from '@element-plus/icons-vue'

// 将字符串智能转换为数值/布尔/原值
const coerce = (val) => {
  if (val === null || val === undefined) return val
  if (typeof val === 'number' || typeof val === 'boolean') return val
  const s = String(val).trim()
  if (s === '') return ''
  if (s.toLowerCase() === 'true') return true
  if (s.toLowerCase() === 'false') return false
  const n = Number(s)
  if (!Number.isNaN(n)) return n
  return val
}

export default {
  name: 'CreateBacktestDialog',
  components: { DynamicForm },
  props: {
    visible: { type: Boolean, default: false },
    initialConfig: { type: Object, default: null }
  },
  emits: ['update:visible', 'created'],
  data() {
    return {
      dataConfigs: [],
      costConfigs: [],
      strategyTemplates: [],
      selectedStrategyTemplate: null,
      strategyParamFormKey: 0,
      paramNameOptions: [],
      timeframeOptions: [
        { value: 'M1', label: '1分钟' },
        { value: 'M5', label: '5分钟' },
        { value: 'M15', label: '15分钟' },
        { value: 'M30', label: '30分钟' },
        { value: 'H1', label: '1小时' },
        { value: 'H4', label: '4小时' },
        { value: 'D1', label: '1天' }
      ],
      insTypeOptions: {
        [TradeInsType.SPOT]: insTypeDesc(TradeInsType.SPOT),
        [TradeInsType.MARGIN]: insTypeDesc(TradeInsType.MARGIN),
        [TradeInsType.SWAP]: insTypeDesc(TradeInsType.SWAP),
        [TradeInsType.FUTURES]: insTypeDesc(TradeInsType.FUTURES),
        [TradeInsType.OPTION]: insTypeDesc(TradeInsType.OPTION)
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        data_config_id: [{ required: true, message: '请选择数据配置', trigger: 'change' }],
        cost_config_id: [{ required: true, message: '请选择费用配置', trigger: 'change' }],
        date_range: [{ type: 'array', required: true, message: '请选择开始和结束日期', trigger: 'change' }],
        strategy_class: [{ required: true, message: '请选择策略', trigger: 'change' }],
        train_days: [{ type: 'number', required: true, message: '请输入训练天数', trigger: 'change' }],
        test_days: [{ type: 'number', required: true, message: '请输入测试天数', trigger: 'change' }],
        symbols: [{ type: 'array', required: true, message: '请填写标的', trigger: 'change' }],
        timeframes: [{ type: 'array', required: true, message: '请选择时间周期', trigger: 'change' }]
      },
      formRef: null,
      form: {
        name: '',
        remark: '',
        data_config_id: undefined,
        cost_config_id: undefined,
        date_range: null,
        strategy_class: undefined,
        enable_optim: true,
        params: {},
        param_items: [],
        train_days: 60,
        test_days: 15,
        embargo_days: 0,
        mode: 'rolling',
        cv_splits: 0,
        max_workers: 1,
        symbols: [],
        timeframes: [],
        sharpe_median_min: 1.0,
        sharpe_p25_min: 0.5,
        mdd_median_max: 0.2,
        min_trades_per_window: 20,
        // 覆盖项已取消，但保留内部状态用于展示数据配置摘要
        market: '',
        quote_currency: '',
        ins_type: TradeInsType.SWAP
      }
      ,
      // debounce/merge
      reloadDebounceId: null,
      loadInFlight: false,
      lastLoadPromise: null
      ,
      thresholdPreset: 'standard'
      ,
      submitting: false
    }
  },
  async created() {
    // 默认最近三月
    this.form.date_range = this.computeShortcutRange(3)
    await this.loadAll()
    // 初始化阈值为标准
    this.applyThresholdPreset('standard')
    // 如果有外部传入的初始配置，填充表单
    if (this.initialConfig) {
      this.fillFromInitial(this.initialConfig)
    }
  },
  methods: {
    fillFromInitial(cfg) {
      try {
        const c = typeof cfg === 'string' ? this.safeParse(cfg) : (cfg || {})
        this.form.name = (c.name ? `${c.name}_copy` : '') || this.form.name
        this.form.data_config_id = c.data_config_id ?? this.form.data_config_id
        this.form.cost_config_id = c.cost_config_id ?? this.form.cost_config_id
        this.form.symbols = Array.isArray(c.symbols) ? [...c.symbols] : this.form.symbols
        this.form.timeframes = Array.isArray(c.timeframes) ? [...c.timeframes] : this.form.timeframes
        if (c.start && c.end) this.form.date_range = [c.start, c.end]
        this.form.train_days = c.train_days ?? this.form.train_days
        this.form.test_days = c.test_days ?? this.form.test_days
        this.form.embargo_days = c.embargo_days ?? this.form.embargo_days
        this.form.mode = c.mode ?? this.form.mode
        this.form.cv_splits = c.cv_splits ?? this.form.cv_splits
        this.form.max_workers = c.max_workers ?? this.form.max_workers
        this.form.sharpe_median_min = c.sharpe_median_min ?? this.form.sharpe_median_min
        this.form.sharpe_p25_min = c.sharpe_p25_min ?? this.form.sharpe_p25_min
        this.form.mdd_median_max = c.mdd_median_max ?? this.form.mdd_median_max
        this.form.min_trades_per_window = c.min_trades_per_window ?? this.form.min_trades_per_window
        // 覆盖项（仅用于展示）
        this.form.market = c.market ?? this.form.market
        this.form.quote_currency = c.quote_currency ?? this.form.quote_currency
        this.form.ins_type = c.ins_type ?? this.form.ins_type

        // 预解析参数：若 param_space 全是单值，则视为未开启寻优
        let enableOptimComputed = this.form.enable_optim
        let paramsToSet = null
        let itemsToSet = null
        if (c.param_space && Object.keys(c.param_space).length > 0) {
          const entries = Object.entries(c.param_space)
          const allSingleton = entries.every(([_, arr]) => Array.isArray(arr) && arr.length <= 1)
          if (allSingleton) {
            enableOptimComputed = false
            paramsToSet = {}
            for (const [k, arr] of entries) {
              if (Array.isArray(arr) && arr.length === 1) paramsToSet[k] = arr[0]
            }
          } else {
            enableOptimComputed = true
            itemsToSet = entries.map(([k, arr]) => {
              if (Array.isArray(arr) && arr.length === 1) {
                return { name: k, mode: 'value', value: arr[0], min: '', max: '', step: '', choices: [] }
              }
              return { name: k, mode: 'choices', choices: arr, value: '', min: '', max: '', step: '' }
            })
          }
        } else if (c.params && Object.keys(c.params).length > 0) {
          enableOptimComputed = false
          paramsToSet = { ...c.params }
        }

        // 先设置策略类与“是否寻优”，以便模板初始化
        if (c.strategy_class) this.form.strategy_class = c.strategy_class
        this.form.enable_optim = !!enableOptimComputed
        if (this.form.strategy_class) this.handleStrategyTemplateChange(this.form.strategy_class)

        // 再写入参数（避免被 handleStrategyTemplateChange 重置）
        if (this.form.enable_optim) {
          if (itemsToSet) this.form.param_items = itemsToSet
        } else {
          if (paramsToSet) this.form.params = paramsToSet
        }
        this.suggestName()
      } catch (e) {
        // ignore
      }
    },
    formatYMD(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    computeShortcutRange(months) {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - months)
      return [this.formatYMD(start), this.formatYMD(end)]
    },
    computeShortcutRangeDates(months) {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - months)
      return [start, end]
    },
    dateShortcuts() {
      // 供 el-date-picker 使用的快捷选项
      return [
        { text: '最近一月', value: () => this.computeShortcutRangeDates(1) },
        { text: '最近三月', value: () => this.computeShortcutRangeDates(3) },
        { text: '最近半年', value: () => this.computeShortcutRangeDates(6) },
        { text: '最近一年', value: () => this.computeShortcutRangeDates(12) }
      ]
    },
    async loadAll() {
      if (this.loadInFlight && this.lastLoadPromise) return this.lastLoadPromise
      this.loadInFlight = true
      this.lastLoadPromise = Promise.all([
        this.loadConfigs(),
        this.loadStrategyTemplates()
      ]).finally(() => {
        this.loadInFlight = false
      })
      return this.lastLoadPromise
    },
    async loadConfigs() {
      try {
        const [dc, cc] = await Promise.all([
          listBacktestConfigs({ type: 'data', page: 1, size: 200 }),
          listBacktestConfigs({ type: 'cost', page: 1, size: 200 })
        ])
        this.dataConfigs = dc.data.items || []
        this.costConfigs = cc.data.items || []
        // 设置默认选择第一个
        if (!this.form.data_config_id && this.dataConfigs.length > 0) {
          this.form.data_config_id = this.dataConfigs[0].id
          this.onDataConfigChange(this.form.data_config_id)
        }
        if (!this.form.cost_config_id && this.costConfigs.length > 0) {
          this.form.cost_config_id = this.costConfigs[0].id
        }
      } catch (e) {
        // ignore
      }
    },
    async loadStrategyTemplates() {
      try {
        const { data } = await getStrategyTemplates()
        this.strategyTemplates = data || []
      } catch (e) {
        // ignore
      }
    },
    handleStrategyTemplateChange(className) {
      this.selectedStrategyTemplate = this.strategyTemplates.find(tpl => tpl.cls === className) || null
      this.strategyParamFormKey++
      // 重置已有参数，使用策略默认参数
      this.form.params = {}
      // 生成参数名下拉选项
      this.paramNameOptions = (this.selectedStrategyTemplate?.parameters || []).map(p => ({
        label: p.label || p.name,
        value: p.name,
        type: p.type || 'string',
        choices: p.choices || p.options || []
      }))
      if (this.form.enable_optim) {
        this.initParamSpaceFromTemplate()
      }
      this.suggestName()
    },
    onDataConfigChange(val) {
      const cfg = this.dataConfigs.find(i => i.id === val)
      if (!cfg) return
      const extra = typeof cfg.extra === 'string' ? this.safeParse(cfg.extra) : (cfg.extra || {})
      if (Array.isArray(extra.symbols)) this.form.symbols = [...extra.symbols]
      if (Array.isArray(extra.timeframes)) this.form.timeframes = [...extra.timeframes]
      if (extra.market) this.form.market = extra.market
      if (extra.quote_currency) this.form.quote_currency = extra.quote_currency
      if (extra.ins_type !== undefined) this.form.ins_type = Number(extra.ins_type)
    },
    safeParse(s) {
      try { return JSON.parse(s) } catch { return {} }
    },
    onEnableOptimToggle(val) {
      if (val) {
        this.initParamSpaceFromTemplate()
      } else {
        // 未启用寻优时强制训练天数为 0
        this.form.train_days = 0
      }
    },
    onThresholdPresetChange(val) {
      this.applyThresholdPreset(val)
    },
    applyThresholdPreset(preset) {
      const presets = {
        loose: { sharpe: 0.5, p25: 0.0, mddPct: 30, trades: 5 },
        standard: { sharpe: 1.0, p25: 0.5, mddPct: 20, trades: 20 },
        strict: { sharpe: 1.5, p25: 1.0, mddPct: 15, trades: 30 }
      }
      const cfg = presets[preset] || presets.standard
      this.form.sharpe_median_min = cfg.sharpe
      this.form.sharpe_p25_min = cfg.p25
      this.mddPercent = cfg.mddPct
      this.form.min_trades_per_window = cfg.trades
      this.thresholdPreset = preset
    },
    onNameInput() {
      this.manualNameEdited = true
    },
    suggestName() {
      if (this.manualNameEdited) return
      const strat = (this.form.strategy_class || '').split('.').pop() || 'Strategy'
      const tfs = (this.form.timeframes || []).join(',') || 'TF'
      const dr = Array.isArray(this.form.date_range) && this.form.date_range[0] && this.form.date_range[1]
        ? `${this.form.date_range[0]}_${this.form.date_range[1]}` : ''
      this.form.name = `${strat}_${tfs}_${dr}`
    },
    initParamSpaceFromTemplate() {
      if (!this.selectedStrategyTemplate || !Array.isArray(this.selectedStrategyTemplate.parameters)) {
        this.form.param_items = []
        return
      }
      this.form.param_items = this.selectedStrategyTemplate.parameters.map(p => {
        const hasChoices = Array.isArray(p.choices || p.options) && (p.choices?.length || p.options?.length)
        return {
          name: p.name,
          mode: hasChoices ? 'choices' : 'value',
          value: '',
          min: '',
          max: '',
          step: '',
          choices: hasChoices ? (p.choices || p.options) : []
        }
      })
      this.suggestName()
    },
    getParamLabel(name) {
      const found = this.paramNameOptions.find(i => i.value === name)
      return found ? found.label : name
    },
    handleParamNameChange(row) {
      const meta = this.paramNameOptions.find(i => i.value === row.name)
      if (!meta) return
      // 如果有预设的可选项，默认枚举；否则维持当前模式
      if (Array.isArray(meta.choices) && meta.choices.length > 0) {
        row.mode = 'choices'
        row.choices = [...meta.choices]
      }
    },
    // 移除添加/删除参数的操作，参数空间由模板全量生成
    async onConfirm() {
      if (this.submitting) return
      this.$refs.formRef.validate(async (ok) => {
        if (!ok) return
        const payload = this.buildPayload()
        try {
          this.submitting = true
          await createWalkForwardTask(payload)
          this.$message.success('创建回测任务成功')
          this.$emit('created')
          this.$emit('update:visible', false)
        } catch (e) {
          console.error('创建回测任务失败:', e)
          this.$message.error('创建回测任务失败')
        } finally {
          this.submitting = false
        }
      })
    },
    buildPayload() {
      const [start, end] = Array.isArray(this.form.date_range) ? this.form.date_range : [null, null]
      const param_space = {}
      // 优先从参数空间构建
      if (this.form.enable_optim) {
        for (const row of this.form.param_items) {
          if (!row || !row.name) continue
          if (row.mode === 'value') {
            param_space[row.name] = [coerce(row.value)]
          } else if (row.mode === 'range') {
            const min = Number(row.min), max = Number(row.max), step = Number(row.step || 1)
            if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) continue
            const arr = []
            for (let x = min; x <= max + 1e-12; x += step) arr.push(Number(x.toFixed(12)))
            param_space[row.name] = arr
          } else if (row.mode === 'choices') {
            param_space[row.name] = Array.isArray(row.choices) ? row.choices.map(coerce) : []
          }
        }
      }
      // 若未启用寻优或空间为空，则回退为 params 单值列表
      if (Object.keys(param_space).length === 0) {
        if (this.form.params && Object.keys(this.form.params).length > 0) {
          for (const [k, v] of Object.entries(this.form.params)) {
            param_space[k] = [coerce(v)]
          }
        } else if (Array.isArray(this.form.param_items)) {
          for (const row of this.form.param_items) {
            if (!row || !row.name) continue
            param_space[row.name] = [coerce(row.value)]
          }
        }
      }
      const payload = {
        name: this.form.name,
        strategy_class: this.form.strategy_class,
        param_space,
        data_config_id: this.form.data_config_id,
        cost_config_id: this.form.cost_config_id,
        symbols: [...(this.form.symbols || [])],
        timeframes: [...(this.form.timeframes || [])],
        start, end,
        // 未启用寻优则强制 0
        train_days: this.form.enable_optim ? this.form.train_days : 0,
        test_days: this.form.test_days,
        embargo_days: this.form.embargo_days,
        mode: this.form.mode,
        cv_splits: this.form.cv_splits,
        max_workers: this.form.max_workers,
        sharpe_median_min: this.form.sharpe_median_min,
        sharpe_p25_min: this.form.sharpe_p25_min,
        mdd_median_max: this.form.mdd_median_max,
        min_trades_per_window: this.form.min_trades_per_window,
        market: this.form.market,
        quote_currency: this.form.quote_currency,
        ins_type: this.form.ins_type
      }
      return payload
    }
  }
  ,
  watch: {
    visible(val) {
      if (val) {
        // 每次打开对话框时刷新配置与策略模板，使用防抖+并发合并
        if (this.reloadDebounceId) clearTimeout(this.reloadDebounceId)
        this.reloadDebounceId = setTimeout(async () => {
          await this.loadAll()
          // 打开时如果有复制的配置，加载完成后立即回填
          if (this.initialConfig) {
            this.fillFromInitial(this.initialConfig)
          }
        }, 200)
      }
    },
    // 复制的 initialConfig 在对话框已渲染后也可能变化，这里联动回填
    initialConfig: {
      deep: true,
      handler(cfg) {
        if (!this.visible || !cfg) return
        // 确保模板已加载再回填
        Promise.resolve(this.loadAll()).then(() => this.fillFromInitial(cfg))
      }
    },
    'form.timeframes': function() { this.suggestName() },
    'form.date_range': function() { this.suggestName() },
    'form.strategy_class': function() { this.suggestName() }
  },
  computed: {
    selectedDataCfg() {
      return this.dataConfigs.find(i => i.id === this.form.data_config_id)
    },
    selectedDataSummary() {
      const extra = this.selectedDataCfg ? (typeof this.selectedDataCfg.extra === 'string' ? this.safeParse(this.selectedDataCfg.extra) : (this.selectedDataCfg.extra || {})) : {}
      return {
        market: extra.market,
        quote_currency: extra.quote_currency,
        ins_type: extra.ins_type
      }
    },
    selectedCostCfg() {
      return this.costConfigs.find(i => i.id === this.form.cost_config_id)
    },
    selectedCostSummary() {
      const params = this.selectedCostCfg ? (typeof this.selectedCostCfg.params === 'string' ? this.safeParse(this.selectedCostCfg.params) : (this.selectedCostCfg.params || {})) : {}
      return {
        fee_rate: params.fee_rate,
        slippage_bps: params.slippage_bps
      }
    },
    mddPercent: {
      get() {
        const v = Number(this.form.mdd_median_max)
        if (!Number.isFinite(v)) return 0
        return Math.round(Math.abs(v) * 100 * 100) / 100
      },
      set(p) {
        const num = Number(p)
        if (!Number.isFinite(num)) {
          this.form.mdd_median_max = undefined
        } else {
          this.form.mdd_median_max = -(Math.abs(num) / 100)
        }
      }
    },
    windowCount() {
      try {
        if (!Array.isArray(this.form.date_range) || !this.form.date_range[0] || !this.form.date_range[1]) return 0
        const start = new Date(this.form.date_range[0] + 'T00:00:00Z')
        const end = new Date(this.form.date_range[1] + 'T00:00:00Z')
        const train = Number(this.form.train_days || 0)
        const test = Number(this.form.test_days || 0)
        const embargo = Number(this.form.embargo_days || 0)
        if (test <= 0) return 1
        if (train <= 0) return 0
        let cur = new Date(start)
        let count = 0
        while (true) {
          let trainStart, trainEnd
          if (this.form.mode === 'expanding') {
            trainStart = start
            trainEnd = new Date(cur)
            trainEnd.setUTCDate(trainEnd.getUTCDate() + train)
          } else {
            trainStart = new Date(cur)
            trainEnd = new Date(cur)
            trainEnd.setUTCDate(trainEnd.getUTCDate() + train)
          }
          const testStart = new Date(trainEnd)
          testStart.setUTCDate(testStart.getUTCDate() + embargo)
          const testEnd = new Date(testStart)
          testEnd.setUTCDate(testEnd.getUTCDate() + test)
          if (testEnd > end) break
          count += 1
          cur = testStart
        }
        return count
      } catch {
        return 0
      }
    },
    allowTestOnly() {
      // 允许测试-only 模式（test_days>0 或 =0 都允许；当 test_days<=0 时，后端会将整个区间视为测试窗口）
      return true
    },
    symbolTfCount() {
      const s = Array.isArray(this.form.symbols) ? this.form.symbols.length : 0
      const t = Array.isArray(this.form.timeframes) ? this.form.timeframes.length : 0
      return s * t
    },
    cvFactor() {
      const c = Number(this.form.cv_splits || 0)
      return c <= 1 ? 1 : c
    },
    paramComboCount() {
      if (!this.form.enable_optim) return 1
      const items = Array.isArray(this.form.param_items) ? this.form.param_items : []
      let total = 1
      for (const row of items) {
        if (!row || !row.name) continue
        if (row.mode === 'value') {
          total *= 1
        } else if (row.mode === 'range') {
          const min = Number(row.min), max = Number(row.max), step = Number(row.step || 1)
          if (Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(step) && step > 0) {
            total *= Math.max(0, Math.floor((max - min) / step) + 1)
          }
        } else if (row.mode === 'choices') {
          total *= Array.isArray(row.choices) ? row.choices.length : 0
        }
      }
      return total
    },
    totalTrainJobs() {
      return this.paramComboCount * this.cvFactor * this.windowCount * Math.max(1, this.symbolTfCount)
    },
    riskTagType() {
      const n = this.totalTrainJobs
      if (n > 50000) return 'danger'
      if (n > 10000) return 'warning'
      return 'success'
    }
  }
}
</script>

<style scoped>
.create-form {
  max-width: 860px;
}
.param-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.qmark, .label-q {
  margin-left: 6px;
  color: #909399;
  cursor: help;
}
.percent-input {
  width: 100%;
}
.mini-summary {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}
</style>


