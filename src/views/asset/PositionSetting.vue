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
        
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPositionSetting, updatePositionSetting } from '@/api/position'
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
  trade_mode: 'isolated',
  default_leverage: '3',
  order_type: 2, // LimitOrder
  trade_type: 4, // FUTURES
})
const saving = ref(false)
const resettingPositionState = ref(false)
const formRef = ref(null)
const positionData = ref(null)

const loadSetting = async () => {
  try {
    const { data } = await getPositionSetting()
    // 把所有字段都赋值到 form
    Object.keys(form.value).forEach(key => {
      if (data[key] !== undefined) {
        // 对于比例字段，将小数转换为百分比显示
        if (key === 'max_strategy_ratio' || key === 'max_symbol_ratio' || key === 'max_ratio') {
          form.value[key] = (parseFloat(data[key]) * 100).toFixed(1)
        } else {
          form.value[key] = data[key]
        }
      }
    })

  } catch (e) {
    ElMessage.error('加载仓位设置失败')
  }
}

const saveSetting = async () => {
  saving.value = true
  try {
    // 创建保存数据，将百分比转换回小数
    const saveData = {
      ...form.value,
      max_strategy_ratio: (parseFloat(form.value.max_strategy_ratio) / 100).toFixed(4),
      max_symbol_ratio: (parseFloat(form.value.max_symbol_ratio) / 100).toFixed(4),
      max_ratio: (parseFloat(form.value.max_ratio) / 100).toFixed(4)
    }
    
    await updatePositionSetting(saveData)
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
  }
  saving.value = false
}


onMounted(async () => {
  await loadSetting()
})
</script>

<style scoped>
.position-setting-page {
  background: #f5f7fa;
  min-height: 30vh;
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