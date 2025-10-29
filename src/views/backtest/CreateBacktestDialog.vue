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
              class_name：{{ selectedDataCfg.class_name }} ｜ 市场：{{ selectedDataSummary.market || '-' }} ｜ 计价币：{{ selectedDataSummary.quote_currency || '-' }} ｜ 产品：{{ insTypeOptions[selectedDataSummary.ins_type] || '-' }}
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

      <el-divider content-position="left">策略与运行模式</el-divider>
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
          <el-form-item prop="run_mode">
            <template #label>
              运行模式
              <el-tooltip placement="top" content="普通：固定参数单次回测；参数寻优：搜索最优参数；Walk-Forward：滚动窗口验证">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.run_mode" placeholder="请选择运行模式" @change="onRunModeChange">
              <el-option label="单次(单标的单周期)" value="single" />
              <el-option label="固定参数" value="normal" />
              <el-option label="Walk-Forward Analysis" value="walk_forward" />
              <!-- <el-option label="蒙特卡洛模拟(开发中)" value="monte_carlo" /> -->
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 普通模式：固定参数 -->
      <el-form-item v-if="form.run_mode === 'normal' || form.run_mode === 'single'" label="策略参数">
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

      <!-- 参数寻优 或 Walk-Forward：参数空间 -->
      <el-form-item label="参数空间" v-if="form.run_mode === 'walk_forward'">
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
          参数组合：{{ paramComboCount }}
          <template v-if="form.run_mode === 'walk_forward'">
            ｜ 训练窗口：{{ windowCount }} ｜ 符号×周期：{{ symbolTfCount }} ｜ CV：{{ cvFactor }}
            <el-tag :type="riskTagType" size="small" style="margin-left:8px;">预估评估数量：{{ totalTrainJobs }}</el-tag>
          </template>
        </div>
      </el-form-item>

      <!-- 性能优化选项 -->
      <el-form-item label="性能优化">
        <el-row :gutter="24">
          <el-col :span="20">
            <el-form-item label="启用本地文件缓存">
              <el-switch 
                v-model="form.use_cache" 
                active-text="启用"
                inactive-text="禁用"
              />
              <div class="mini-summary" style="margin-top: 4px;">
                启用后数据将缓存在本地磁盘，提升多窗口同数据的回测性能(如果使用Redis缓存， 没必要启用)
              </div>
            </el-form-item>
            <el-form-item label="记录日志">
              <el-switch 
                v-model="form.log_file" 
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="mini-summary" style="margin-top: 4px;">
                写入 {taskId}.log（每个任务一个文件），默认关闭
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form-item>

      <el-divider content-position="left">子策略</el-divider>
      <el-form-item>
        <el-row :gutter="24" style="width: 100%;">
          <el-col :span="7" style="min-width: 200px;">
            <div class="policy-list scrollable-policy-list">
              <template v-for="(tpl, idx) in riskPolicyTemplates" :key="tpl.name">
                <div
                  @click="selectRiskPolicy(idx)"
                  :class="{active: idx === selectedRiskPolicyIdx}"
                  style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 8px;"
                >
                  <span>
                    {{ tpl.name }}
                    <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                      {{ tpl.tag }}
                    </el-tag>
                  </span>
                  <el-switch
                    :model-value="isRiskPolicyEnabled(tpl.name)"
                    @update:model-value="val => setRiskPolicyEnabled(tpl.name, val)"
                    @click.stop
                  />
                </div>
              </template>
              <div v-if="!riskPolicyTemplates.length" style="color: #b0b3b8; text-align: center; margin-top: 40px;">暂无策略</div>
            </div>
          </el-col>
          <el-col :span="1" class="vertical-divider-col">
            <div class="vertical-divider"></div>
          </el-col>
          <el-col :span="15">
            <div
              v-if="currentRiskPolicyTemplate"
              :class="{ 'param-disabled': !isRiskPolicyEnabled(currentRiskPolicyTemplate.name) }"
              style="padding: 24px; background: #fff; border-radius: 8px; min-height: 160px;"
            >
              <DynamicForm
                :fields="currentRiskPolicyTemplate.parameters || []"
                v-model:modelValue="currentRiskPolicyParams"
                :key="currentRiskPolicyTemplate.name"
                :disabled="!isRiskPolicyEnabled(currentRiskPolicyTemplate.name)"
              />
            </div>
            <div v-else style="color: #b0b3b8; padding: 24px;">请选择左侧策略</div>
          </el-col>
        </el-row>
      </el-form-item>

      

      <el-divider v-if="form.run_mode === 'walk_forward'" content-position="left">Walk-Forward 设置</el-divider>
      <el-row v-if="form.run_mode === 'walk_forward'" :gutter="20">
        <el-col :span="8">
          <el-form-item prop="train_days">
            <template #label>
              训练天数
              <el-tooltip placement="top" content="每个训练窗口包含的自然日数。结合周期与数据覆盖自动计算窗口数量。">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.train_days" :min="0" :controls="false" />
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
      <!-- Walk-Forward专属：窗口模式和CV折数 -->
      <el-row v-if="form.run_mode === 'walk_forward'" :gutter="20">
        <el-col :span="8">
          <el-form-item>
            <template #label>
              窗口模式
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
      </el-row>

      <!-- Walk-Forward：优化目标 -->
      <el-row v-if="form.run_mode === 'walk_forward'" :gutter="20">
        <el-col :span="8">
          <el-form-item prop="optimization_objective">
            <template #label>
              优化目标
              <el-tooltip placement="top" content="用于训练阶段选择最佳参数的目标函数">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-select v-model="form.optimization_objective" placeholder="选择优化目标">
              <el-option label="夏普比率" value="sharpe_ratio" />
              <el-option label="卡尔玛比率" value="calmar_ratio" />
              <el-option label="索提诺比率" value="sortino_ratio" />
              <el-option label="盈亏比" value="profit_factor" />
              <el-option label="胜率" value="win_rate" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          
        </el-col>
      </el-row>
      
      <el-divider v-if="form.run_mode === 'walk_forward'" content-position="left">Optuna 设置(贝叶斯/TPE参数搜索)</el-divider>
      <!-- 普通/参数寻优模式：并发度设置 -->
      <el-row :gutter="20" v-if="form.run_mode === 'walk_forward'">
        <el-col :span="8">
            <el-form-item>
              <template #label>
                启用 Optuna
                <el-tooltip placement="top" content="启用后在训练窗口内使用贝叶斯/TPE进行参数搜索。关闭时使用网格搜索。">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-switch v-model="form.optuna_enabled" />
            </el-form-item>
          </el-col>
          <el-col :span="8" v-if="form.run_mode === 'walk_forward' && form.optuna_enabled">
            <el-form-item>
              <template #label>
                试验次数
                <el-tooltip placement="top" content="Optuna 评估次数（建议 50~100）">
                  <el-icon class="label-q"><InfoFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.optuna_n_trials" :min="1" :max="10000" :controls="false" />
            </el-form-item>
          </el-col>
      </el-row>
      <el-divider content-position="left" v-if="form.run_mode !== 'single'">并发度设置</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item>
            <template #label>
              并发度
              <el-tooltip placement="top" content="并发执行的进程数（参数组合级并行）">
                <el-icon class="label-q"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <el-input-number v-model="form.max_workers" :min="1" :max="16" :controls="false" style="width: 100%;" />
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
import { listBacktestConfigs, createEnhancedBacktest } from '@/api/backtest'
import { getStrategyTemplates, getStrategyPolicyTemplates } from '@/api/strategy'
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
      // 风控
      riskPolicyTemplates: [],
      selectedRiskPolicyIdx: 0,
      riskPolicies: [],
      paramNameOptions: [],
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
        timeframes: [{ type: 'array', required: true, message: '请选择时间周期', trigger: 'change' }],
        optimization_objective: [{ required: true, message: '请选择优化目标', trigger: 'change' }]
      },
      formRef: null,
      form: {
        name: '',
        remark: '',
        data_config_id: undefined,
        cost_config_id: undefined,
        date_range: null,
        strategy_class: undefined,
        run_mode: 'normal',  // 运行模式：normal/param_search/walk_forward
        params: {},
        param_items: [],
        train_days: 60,
        test_days: 15,
        embargo_days: 0,
        mode: 'rolling',
        cv_splits: 0,
        max_workers: 1,
        optimization_objective: 'sharpe_ratio',
        symbols: [],
        timeframes: [],
        
        // Optuna
        optuna_enabled: true,
        optuna_n_trials: 80,
        // 性能优化配置
        use_cache: false,
        log_file: false,
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
      
      submitting: false
    }
  },
  async created() {
    // 默认最近三月
    this.form.date_range = this.computeShortcutRange(3)
    await this.loadAll()
    // 加载风控策略模板
    try {
      const { data } = await getStrategyPolicyTemplates()
      this.riskPolicyTemplates = data || []
    } catch (e) { /* ignore */ }
    // 如果有外部传入的初始配置，填充表单
    if (this.initialConfig) {
      this.fillFromInitial(this.initialConfig)
    }
  },
  methods: {
    fillFromInitial(cfg) {
      try {
        const c = typeof cfg === 'string' ? this.safeParse(cfg) : (cfg || {})
        
        // 直接使用run_mode字段，不再推断
        const runMode = c.mode || 'single'
        
        // 根据运行模式解析参数
        let paramsToSet = null
        let itemsToSet = null
        
        if (runMode === 'normal' || runMode === 'single') {
          // 普通模式：从strategy_params或params获取
          if (c.strategy_params && Object.keys(c.strategy_params).length > 0) {
            paramsToSet = { ...c.strategy_params }
          } else if (c.params && Object.keys(c.params).length > 0) {
            paramsToSet = { ...c.params }
          } else if (c.param_space && Object.keys(c.param_space).length > 0) {
            // 如果只有param_space，提取单值
            paramsToSet = {}
            for (const [k, arr] of Object.entries(c.param_space)) {
              if (Array.isArray(arr) && arr.length === 1) paramsToSet[k] = arr[0]
            }
          }
        } else {
          // 参数寻优或WF：从param_space获取
          if (c.param_space && Object.keys(c.param_space).length > 0) {
            itemsToSet = Object.entries(c.param_space).map(([k, arr]) => {
              if (Array.isArray(arr) && arr.length === 1) {
                return { name: k, mode: 'value', value: arr[0], min: '', max: '', step: '', choices: [] }
              }
              const range = this.inferRangeFromArray(arr)
              if (range) {
                return { name: k, mode: 'range', value: '', min: range.min, max: range.max, step: range.step, choices: [] }
              }
              return { name: k, mode: 'choices', choices: arr, value: '', min: '', max: '', step: '' }
            })
          }
        }
        
        // 基本信息
        this.form.name = (c.name ? `${c.name}_copy` : '') || this.form.name
        this.form.data_config_id = c.data_config_id ?? this.form.data_config_id
        this.form.cost_config_id = c.cost_config_id ?? this.form.cost_config_id
        this.form.symbols = Array.isArray(c.symbols) ? [...c.symbols] : this.form.symbols
        this.form.timeframes = Array.isArray(c.timeframes) ? [...c.timeframes] : this.form.timeframes
        
        // 时间范围（支持多种字段名）
        if (c.start && c.end) {
          this.form.date_range = [c.start, c.end]
        } else if (c.start_time && c.end_time) {
          this.form.date_range = [c.start_time, c.end_time]
        }
        
        this.form.train_days = c.train_days ?? this.form.train_days
        this.form.test_days = c.test_days ?? this.form.test_days
        this.form.embargo_days = c.embargo_days ?? this.form.embargo_days
        this.form.cv_splits = c.cv_splits ?? this.form.cv_splits
        this.form.max_workers = c.max_workers ?? this.form.max_workers
        
        
        // 窗口模式（仅WF使用）
        if (c.mode === 'rolling' || c.mode === 'expanding') {
          this.form.mode = c.mode
        }
        
        // 覆盖项（仅用于展示）
        this.form.market = c.market ?? this.form.market
        this.form.quote_currency = c.quote_currency ?? this.form.quote_currency
        this.form.ins_type = c.ins_type ?? this.form.ins_type

        // 先设置运行模式和策略类
        this.form.run_mode = runMode
        if (c.strategy_class) {
          this.form.strategy_class = c.strategy_class
          this.handleStrategyTemplateChange(c.strategy_class)
        }
        
        // 等待下一个tick，让handleStrategyTemplateChange执行完毕
        this.$nextTick(() => {
          // 再写入参数（避免被 handleStrategyTemplateChange 重置）
          if (runMode === 'normal' || runMode === 'single') {
            if (paramsToSet) {
              this.form.params = { ...paramsToSet }
              this.strategyParamFormKey++
            }
          } else {
            if (itemsToSet && itemsToSet.length > 0) {
              this.form.param_items = [...itemsToSet]
            }
          }
          this.suggestName()
          
          // 风控：根据初始配置回填
          try {
            const rps = Array.isArray(c.risk_policies) ? c.risk_policies : []
            this.riskPolicies = []
            for (const rp of rps) {
              const cls = rp.class_name || rp.cls
              const tpl = (this.riskPolicyTemplates || []).find(t => t.cls === cls)
              const name = tpl ? tpl.name : (cls || 'policy')
              this.riskPolicies.push({ 
                name, 
                enabled: true, 
                params: rp.config || rp.params || {} 
              })
            }
          } catch (e) { 
            // ignore
          }
        })
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
        this.loadStrategyTemplates(),
        this.loadRiskTemplates()
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
    async loadRiskTemplates() {
      try {
        const { data } = await getStrategyPolicyTemplates()
        this.riskPolicyTemplates = data || []
      } catch (e) { /* ignore */ }
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
    inferRangeFromArray(arr) {
      if (!Array.isArray(arr) || arr.length < 2) return null
      const nums = arr.map(Number)
      if (nums.some(n => !Number.isFinite(n))) return null
      let step = null
      for (let i = 1; i < nums.length; i++) {
        const d = Number((nums[i] - nums[i - 1]).toFixed(12))
        if (i === 1) {
          step = d
        } else if (Math.abs(d - step) > 1e-9) {
          return null
        }
      }
      if (!(step > 0)) return null
      return { min: nums[0], max: nums[nums.length - 1], step }
    },
    onRunModeChange(val) {
      if (val === 'normal' || val === 'single') {
        // 普通模式：使用固定参数
        this.form.train_days = 0
        this.form.params = {}
      } else if (val === 'walk_forward') {
        // Walk-Forward：初始化参数空间和窗口设置
        this.initParamSpaceFromTemplate()
        if (this.form.train_days === 0) {
          this.form.train_days = 60
        }
        if (!this.form.optimization_objective) this.form.optimization_objective = 'sharpe_ratio'
      }
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
    // 风控相关
    selectRiskPolicy(idx) {
      this.selectedRiskPolicyIdx = idx
    },
    isRiskPolicyEnabled(name) {
      const found = this.riskPolicies.find(p => p.name === name)
      return found ? found.enabled : false
    },
    setRiskPolicyEnabled(name, val) {
      let found = this.riskPolicies.find(p => p.name === name)
      if (found) {
        found.enabled = val
      } else {
        this.riskPolicies.push({ name, enabled: val, params: {} })
      }
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
          await createEnhancedBacktest(payload)
          this.$message.success('创建回测任务成功')
          this.$emit('created')
          this.$emit('update:visible', false)
        } catch (e) {
          console.error('创建回测任务失败:', e)
          this.$message.error('创建回测任务失败: ' + (e.response?.data?.detail || e.message))
        } finally {
          this.submitting = false
        }
      })
    },
    buildPayload() {
      const [start, end] = Array.isArray(this.form.date_range) ? this.form.date_range : [null, null]
      
      // 构建参数空间或固定参数
      const param_space = {}
      let strategy_params = null
      
      if (this.form.run_mode === 'param_search' || this.form.run_mode === 'walk_forward') {
        // 参数寻优或WF：构建参数空间
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
      } else {
        // 普通模式：使用固定参数
        if (this.form.params && Object.keys(this.form.params).length > 0) {
          strategy_params = {}
          for (const [k, v] of Object.entries(this.form.params)) {
            strategy_params[k] = coerce(v)
          }
        }
      }
      
      // 如果既没有param_space也没有strategy_params，从param_items构建单值param_space
      if (Object.keys(param_space).length === 0 && !strategy_params && Array.isArray(this.form.param_items)) {
        for (const row of this.form.param_items) {
          if (!row || !row.name) continue
          param_space[row.name] = [coerce(row.value)]
        }
      }
      
      // 获取数据配置和费用配置
      const dataConfig = this.dataConfigs.find(c => c.id === this.form.data_config_id)
      const dataExtra = dataConfig ? (typeof dataConfig.extra === 'string' ? JSON.parse(dataConfig.extra) : dataConfig.extra) : {}
      
      const costConfig = this.costConfigs.find(c => c.id === this.form.cost_config_id)
      const costParams = costConfig ? (typeof costConfig.params === 'string' ? JSON.parse(costConfig.params) : costConfig.params) : {}
      const payload = {
        name: this.form.name,
        run_mode: this.form.run_mode,  // 前端运行模式（用于回填）
        strategy_class: this.form.strategy_class,
        symbols: [...(this.form.symbols || [])],
        timeframes: [...(this.form.timeframes || [])],
        start_time: start,
        end_time: end,
        market: this.selectedDataCfg.extra.market,
        quote_currency: this.selectedDataCfg.extra.quote_currency,
        ins_type: this.selectedDataCfg.extra.ins_type,
        initial_balance: 10000,
        executor_class: costConfig?.class_name,
        executor_config: costParams || {},
        max_workers: this.form.max_workers,
        embargo_days: this.form.embargo_days,
        cv_splits: this.form.cv_splits,
        data_source_config: dataExtra.data_source_config || {},
        data_config_id: this.form.data_config_id,
        cost_config_id: this.form.cost_config_id
      }
      
      // 参数
      if (strategy_params) {
        payload.strategy_params = strategy_params
      } else if (Object.keys(param_space).length > 0) {
        payload.param_space = param_space
      }
      
      // Walk-Forward专属参数
      if (this.form.run_mode === 'walk_forward') {
        payload.train_days = this.form.train_days
        payload.test_days = this.form.test_days
        payload.optimization_objective = this.form.optimization_objective || 'sharpe_ratio'
        // window mode passthrough for backend (wf_window_mode)
        payload.wf_window_mode = this.form.mode
        // Optuna
        payload.optuna_enabled = !!this.form.optuna_enabled
        payload.optuna_n_trials = Number(this.form.optuna_n_trials || 0)
      }
      
      // 性能优化配置
      payload.use_cache = this.form.use_cache
      // 日志选项
      payload.log_file = !!this.form.log_file
      
      // 组装风控参数（仅传已启用的）
      payload.risk_policies = (this.riskPolicyTemplates || [])
        .filter(tpl => this.isRiskPolicyEnabled(tpl.name))
        .map(tpl => ({ 
          class_name: tpl.cls, 
          config: (this.riskPolicies.find(p => p.name === tpl.name)?.params) || {} 
        }))
      payload.mode = this.form.run_mode
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
    
    windowCount() {
      if (this.form.run_mode !== 'walk_forward') return 1
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
      if (this.form.run_mode === 'normal') return 1
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
    currentRiskPolicyTemplate() {
      return this.riskPolicyTemplates[this.selectedRiskPolicyIdx] || null
    },
    currentRiskPolicyParams: {
      get() {
        const tpl = this.currentRiskPolicyTemplate
        if (!tpl) return {}
        let found = this.riskPolicies.find(p => p.name === tpl.name)
        if (!found) {
          found = { name: tpl.name, enabled: false, params: {} }
          this.riskPolicies.push(found)
        }
        return found.params
      },
      set(val) {
        const tpl = this.currentRiskPolicyTemplate
        if (!tpl) return
        let found = this.riskPolicies.find(p => p.name === tpl.name)
        if (found) found.params = val
      }
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


