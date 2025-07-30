<template>
  <div class="position-setting-page">
    <el-card>
      <template #header>
        <div class="header-bar">
          <span>仓位设置</span>
          <el-button type="primary" @click="saveSetting" :loading="saving" style="float:right">保存</el-button>
        </div>
      </template>
      <el-form :model="form" label-width="200px" ref="formRef">
        <el-row :gutter="40">
          <el-col :span="12">
            <el-form-item label="初始余额" prop="init_amount" required>
              <el-input v-model="form.init_amount" type="text" />
            </el-form-item>
            <el-form-item label="单个策略最大仓位" prop="max_strategy_amount" required>
              <el-input v-model="form.max_strategy_amount" type="number" placeholder="请输入单个策略最大仓位" />
            </el-form-item>
            <el-form-item label="单个策略最大仓位比例(%)" prop="max_strategy_ratio" required>
              <el-input v-model="form.max_strategy_ratio" type="number" placeholder="请输入单个策略最大仓位比例" />
            </el-form-item>
            <el-form-item label="单个标的最大仓位" prop="max_symbol_amount" required>
              <el-input v-model="form.max_symbol_amount" type="number" placeholder="请输入单个标的最大仓位" />
            </el-form-item>
            <el-form-item label="单个标的最大仓位比例(%)" prop="max_symbol_ratio" required>
              <el-input v-model="form.max_symbol_ratio" type="number" placeholder="请输入单个标的最大仓位比例" />
            </el-form-item>
            <el-form-item label="单次开仓最大仓位" prop="max_amount" required>
              <el-input v-model="form.max_amount" type="number" placeholder="请输入单次开仓最大仓位" />
            </el-form-item>
            <el-form-item label="单次开仓最大仓位比例(%)" prop="max_ratio" required>
              <el-input v-model="form.max_ratio" type="number" placeholder="请输入单次开仓最大仓位比例" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认交易模式" prop="trade_mode" required>
              <template #label>
                默认交易模式
                <el-tooltip content="策略不指定交易模式时的默认交易模式" placement="top">
                  <el-icon style="margin-left: 4px; color: #b0b3b8; cursor: pointer;"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-radio-group v-model="form.trade_mode">
                <el-radio :value="'isolated'">逐仓</el-radio>
                <el-radio :value="'cross'">全仓</el-radio>
                <el-radio :value="'cash'">现货</el-radio>
                <el-radio :value="'spot_isolated'">现货带单</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="默认杠杆倍数" prop="default_leverage" required>
              <template #label>
                默认杠杆倍数
                <el-tooltip content="策略不指定杠杆倍数时的默认杠杆倍数" placement="top">
                  <el-icon style="margin-left: 4px; color: #b0b3b8; cursor: pointer;"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-input v-model="form.default_leverage" type="number" />
            </el-form-item>
            <el-form-item label="默认订单类型" prop="order_type" required>
              <template #label>
                默认订单类型
                <el-tooltip content="策略不指定订单类型时的默认订单类型" placement="top">
                  <el-icon style="margin-left: 4px; color: #b0b3b8; cursor: pointer;"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-radio-group v-model="form.order_type">
                <el-radio :value="2">限价</el-radio>
                <el-radio :value="1">市价</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="默认交易类型" prop="trade_type" required>
              <template #label>
                默认交易类型
                <el-tooltip content="策略不指定交易类型时的默认交易类型" placement="top">
                  <el-icon style="margin-left: 4px; color: #b0b3b8; cursor: pointer;"><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
              <el-radio-group v-model="form.trade_type">
                <el-radio :value="1">现货</el-radio>
                <el-radio :value="2">杠杆</el-radio>
                <el-radio :value="3">合约</el-radio>
                <el-radio :value="4">期货</el-radio>
                <el-radio :value="5">期权</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="风控策略" prop="risk_policies">
          <el-row :gutter="24" style="width: 100%;">
            <el-col :span="7" style="min-width: 200px;">
              <div class="policy-list" style="min-height: 220px;">
                <div
                  v-for="(tpl, idx) in policyTemplates"
                  :key="tpl.cls"
                  @click="selectPolicy(idx)"
                  :class="{active: idx === selectedPolicyIdx}"
                  style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 8px;"
                >
                  <span>
                    {{ tpl.name }}
                    <el-tag
                      v-if="tpl.tag"
                      size="small"
                      type="info"
                      effect="plain"
                      style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                    >
                      {{ formatTag(tpl.tag) }}
                    </el-tag>
                  </span>
                  <el-switch
                    :model-value="isPolicyEnabled(tpl.name)"
                    @update:model-value="val => setPolicyEnabled(tpl.name, val)"
                    @click.stop
                  />
                </div>
                <div v-if="!policyTemplates.length" style="color: #b0b3b8; text-align: center; margin-top: 40px;">暂无策略</div>
              </div>
            </el-col>
            <el-col :span="1" class="vertical-divider-col">
              <div class="vertical-divider"></div>
            </el-col>
            <el-col :span="16">
              <div
                v-if="currentTemplate"
                :class="{ 'param-disabled': !isPolicyEnabled(currentTemplate.name) }"
                style="padding: 2px; background: #fff; min-height: 100px;"
              >
                <DynamicForm
                  :fields="currentTemplate.parameters || []"
                  v-model:modelValue="currentParams"
                  :key="currentTemplate.name"
                  :disabled="!isPolicyEnabled(currentTemplate.name)"
                />
              </div>
              <div v-else style="color: #b0b3b8; padding: 24px;">请选择左侧策略</div>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPositionSetting, updatePositionSetting, getPolicyTemplates } from '@/api/position'
import DynamicForm from '@/components/DynamicForm.vue'
import { formatTag } from '@/utils/format'
import { QuestionFilled } from '@element-plus/icons-vue'

const form = ref({
  init_amount: '',
  max_strategy_amount: '',
  max_strategy_ratio: '',
  max_symbol_amount: '',
  max_symbol_ratio: '',
  max_amount: '',
  max_ratio: '',
  risk_policies: [], // [{ name, enabled, params }]
  trade_mode: 'isolated',
  default_leverage: '3',
  order_type: 2, // LimitOrder
  trade_type: 4, // FUTURES
})
const saving = ref(false)
const resettingPositionState = ref(false)
const formRef = ref(null)
const policyTemplates = ref([])
const riskPoliciesSetting = ref([]) // setting数据
const selectedPolicyIdx = ref(0)
const positionData = ref(null)

const getPolicySetting = (name) => riskPoliciesSetting.value.find(p => p.name === name) || {}

const currentTemplate = computed(() => policyTemplates.value[selectedPolicyIdx.value] || null)
const currentPolicySetting = computed(() => getPolicySetting(currentTemplate.value?.name))

const currentParams = computed({
  get() {
    if (!currentTemplate.value) return {}
    // 直接用 riskPoliciesSetting 里的 params，回显优先
    const setting = getPolicySetting(currentTemplate.value.name)
    const params = {}
    for (const p of currentTemplate.value.parameters || []) {
      params[p.name] = (setting.params && setting.params[p.name] !== undefined)
        ? setting.params[p.name]
        : p.default
    }
    return params
  },
  set(val) {
    const name = currentTemplate.value?.name
    if (!name) return
    let policy = riskPoliciesSetting.value.find(p => p.name === name)
    if (!policy) {
      policy = { 
        name, 
        enabled: false, 
        params: {},
        class_name: currentTemplate.value.cls 
      }
      riskPoliciesSetting.value.push(policy)
    }
    policy.params = { ...val }
  }
})

const isPolicyEnabled = (name) => (getPolicySetting(name)?.enabled) || false
const setPolicyEnabled = (name, val) => {
  let policy = riskPoliciesSetting.value.find(p => p.name === name)
  if (!policy) {
    const tpl = policyTemplates.value.find(t => t.name === name)
    policy = { name, enabled: val, params: {}, class_name: tpl?.cls }
    riskPoliciesSetting.value.push(policy)
  }
  policy.enabled = val
}

const selectPolicy = (idx) => { selectedPolicyIdx.value = idx }

const loadSetting = async () => {
  try {
    const { data } = await getPositionSetting()
    // 把所有字段都赋值到 form
    Object.keys(form.value).forEach(key => {
      if (data[key] !== undefined) {
        form.value[key] = data[key]
      }
    })

    // 确保每个策略都有 class_name
    riskPoliciesSetting.value = (data.risk_policies || []).map(policy => {
      if (!policy.class_name) {
        const tpl = policyTemplates.value.find(t => t.name === policy.name)
        if (tpl) {
          policy.class_name = tpl.cls
        }
      }
      return policy
    })
  } catch (e) {
    ElMessage.error('加载仓位设置失败')
  }
}



const saveSetting = async () => {
  saving.value = true
  try {
    // 确保每个策略都有 class_name
    const policiesToSave = riskPoliciesSetting.value.map(policy => {
      if (!policy.class_name) {
        const tpl = policyTemplates.value.find(t => t.name === policy.name)
        if (tpl) {
          policy.class_name = tpl.cls
        }
      }
      return policy
    })
    
    await updatePositionSetting({
      ...form.value,
      risk_policies: JSON.parse(JSON.stringify(policiesToSave))
    })
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
  }
  saving.value = false
}



onMounted(async () => {
  const { data } = await getPolicyTemplates()
  policyTemplates.value = data
  await loadSetting()
})
</script>

<style scoped>
.position-setting-page {
  background: #f5f7fa;
  min-height: 100vh;
  padding: 20px 0 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  width: 95%;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.3rem;
  font-weight: 500;
}
.active {
  background: #f0f7ff;
}
.vertical-divider-col {
  display: flex;
  align-items: stretch;
  justify-content: center;
}
.vertical-divider {
  width: 1px;
  background: #e0e0e0;
  height: 100%;
  min-height: 220px;
  margin: 0 8px;
}
.policy-list {
  padding-right: 8px;
}
.param-disabled {
  pointer-events: none;
  opacity: 0.5;
  filter: grayscale(0.5);
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-3 {
  margin-top: 0.75rem;
}
.mt-4 {
  margin-top: 1rem;
}
.card-content-left {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}
.text-success {
  color: #28a745 !important;
}
.text-danger {
  color: #dc3545 !important;
}
</style> 