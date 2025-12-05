<template>
  <div class="dynamic-form">
    <form @submit.prevent="handleSubmit">
      <div v-for="field in fields" :key="field.name" class="form-group row">
        <div class="form-row">
          <label :for="field.name" class="form-label col-label">
            {{ field.label || field.name }}
            <el-tooltip v-if="field.description" :content="field.description" placement="top">
              <span class="desc-tip">?</span>
            </el-tooltip>
            <span v-if="field.required" class="required">*</span>
          </label>
          <div class="col-input">
            <!-- String, Int, Float input -->
            <input
              v-if="['string', 'int', 'float'].includes(field.type)"
              :type="field.type === 'int' ? 'number' : 'text'"
              :id="field.name"
              v-model="formData[field.name]"
              :required="field.required"
              :min="field.min"
              :max="field.max"
              :maxlength="field.length"
              class="form-control"
              @input="e => handleFloatInput(e, field.name, field.type)"
            />

            <!-- Password input -->
            <input
              v-else-if="field.type === 'password'"
              type="password"
              :id="field.name"
              v-model="formData[field.name]"
              :required="field.required"
              :maxlength="field.length"
              class="form-control"
            />

            <!-- Boolean input -->
            <el-switch
              v-else-if="field.type === 'bool'"
              :id="field.name"
              v-model="formData[field.name]"
              :required="field.required"
            />

            <!-- Datetime input -->
            <input
              v-else-if="field.type === 'datetime'"
              type="datetime-local"
              :id="field.name"
              v-model="formData[field.name]"
              :required="field.required"
              :min="field.min"
              :max="field.max"
              class="form-control"
            />

            <!-- Radio buttons -->
            <template v-else-if="field.type === 'radio' && field.choices && field.choices.length > 16">
              <el-select
                v-model="formData[field.name]"
                filterable
                :placeholder="field.placeholder || '请选择'"
                style="width: 100%;"
                :disabled="shouldDisable(field)"
              >
                <el-option
                  v-for="choice in field.choices"
                  :key="Array.isArray(choice) ? choice[0] : choice"
                  :label="Array.isArray(choice) ? choice[1] : choice"
                  :value="Array.isArray(choice) ? choice[0] : choice"
                />
              </el-select>
            </template>
            <div v-else-if="field.type === 'radio'" class="radio-group">
              <div v-for="choice in field.choices" :key="Array.isArray(choice) ? choice[0] : choice" class="form-check">
                <input
                  type="radio"
                  :id="`${field.name}-${Array.isArray(choice) ? choice[0] : choice}`"
                  :name="field.name"
                  :value="Array.isArray(choice) ? choice[0] : choice"
                  v-model="formData[field.name]"
                  :required="field.required"
                  class="form-check-input"
                  :disabled="shouldDisable(field)"
                />
                <label :for="`${field.name}-${Array.isArray(choice) ? choice[0] : choice}`" class="form-check-label">
                  {{ Array.isArray(choice) ? choice[1] : choice }}
                </label>
              </div>
            </div>

            <!-- Select dropdown -->
            <template v-else-if="field.type === 'select' && field.choices && field.choices.length > 16">
              <el-select
                v-model="formData[field.name]"
                multiple
                filterable
                :placeholder="field.placeholder || '请选择'"
                style="width: 100%;"
                :disabled="shouldDisable(field)"
              >
                <el-option
                  v-for="choice in field.choices"
                  :key="Array.isArray(choice) ? choice[0] : choice"
                  :label="Array.isArray(choice) ? choice[1] : choice"
                  :value="Array.isArray(choice) ? choice[0] : choice"
                />
              </el-select>
            </template>
            <template v-else-if="field.type === 'select'">
              <el-checkbox-group v-model="formData[field.name]" class="checkbox-multicol" :disabled="shouldDisable(field)">
                <el-checkbox
                  v-for="choice in field.choices"
                  :key="Array.isArray(choice) ? choice[0] : choice"
                  :value="Array.isArray(choice) ? choice[0] : choice"
                  :disabled="shouldDisable(field)"
                >
                  {{ Array.isArray(choice) ? choice[1] : choice }}
                </el-checkbox>
              </el-checkbox-group>
            </template>

            <!-- Array input -->
            <el-select
              v-else-if="field.type === 'array'"
              v-model="getArrayProxy(field.name).value"
              multiple
              filterable
              allow-create
              default-first-option
              :placeholder="field.placeholder || '请输入并回车添加'"
              :ref="`arrayRef-${field.name}`"
              style="width: 100%;"
              @change="() => handleArrayInputChange(field.name)"
            >
              <el-option
                v-for="item in getArrayProxy(field.name).value"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>

            <!-- Model config input -->
            <div v-else-if="field.type === 'model'" class="model-config-editor">
              <!-- Model selector -->
              <div class="model-selector">
                <el-select
                  v-model="getModelConfig(field.name).model_id"
                  filterable
                  placeholder="请选择模型"
                  style="width: 100%;"
                  @change="(val) => onModelChange(field.name, val)"
                  :loading="loadingModels[field.name]"
                >
                  <el-option
                    v-for="model in availableModels[field.name] || []"
                    :key="model.id"
                    :label="`${model.name} (${model.version})`"
                    :value="model.id"
                  />
                </el-select>
                <div class="model-actions">
                  <el-button
                    size="small"
                    @click="viewModelDetail(field.name)"
                    :disabled="!getModelConfig(field.name).model_id"
                  >
                    查看
                  </el-button>
                  <el-button
                    size="small"
                    @click="copyFeatureConfig(field.name)"
                    :disabled="!getModelConfig(field.name).feature_config || !getModelConfig(field.name).feature_config.factors || getModelConfig(field.name).feature_config.factors.length === 0"
                  >
                    复制 feature_config
                  </el-button>
                </div>
              </div>
              
              <!-- Feature config JSON editor -->
              <div class="feature-config-editor">
                <div class="editor-header">
                  <span>特征配置 (JSON)</span>
                  <div class="editor-actions">
                    <el-button size="small" @click="formatJSON(field.name)">格式化</el-button>
                    <el-button size="small" @click="validateJSON(field.name)">验证</el-button>
                  </div>
                </div>
                <el-input
                  v-model="featureConfigText[field.name]"
                  type="textarea"
                  :rows="10"
                  placeholder='请输入特征配置 JSON，例如: {"factors": [{"id": 1, "name": "factor1", "class_name": "model|Factor", "params": {}}], "encoder_classes": null}'
                  @blur="onFeatureConfigBlur(field.name)"
                  class="json-editor"
                />
                <div v-if="jsonError[field.name]" class="json-error">
                  {{ jsonError[field.name] }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, watch, nextTick, computed, getCurrentInstance } from 'vue'
import { getModels, getModel } from '@/api/model'
import { ElMessage } from 'element-plus'

export default {
  name: 'DynamicForm',
  props: {
    fields: {
      type: Array,
      required: true
    },
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // Model config related state
    const availableModels = ref({})
    const loadingModels = ref({})
    const featureConfigText = ref({})
    const jsonError = ref({})
    function getInitialFormData() {
      const data = {}
      props.fields.forEach(field => {
        // 自动选中唯一选项
        if (
          (field.type === 'select' || field.type === 'radio') &&
          field.required &&
          Array.isArray(field.choices) &&
          field.choices.length === 1
        ) {
          const val = Array.isArray(field.choices[0]) ? field.choices[0][0] : field.choices[0]
          if (field.type === 'select') {
            data[field.name] = [val]
          } else {
            data[field.name] = val
          }
        } else {
          // select类型默认值为数组
          if (field.type === 'select') {
            if (Array.isArray(props.modelValue[field.name])) {
              data[field.name] = props.modelValue[field.name]
            } else if (field.default !== undefined && field.default !== null) {
              data[field.name] = Array.isArray(field.default) ? field.default : [field.default]
            } else {
              data[field.name] = []
            }
          } else if (field.type === 'array') {
            data[field.name] = Array.isArray(props.modelValue[field.name])
              ? props.modelValue[field.name]
              : field.default !== undefined
                ? field.default
                : []
          } else if (field.type === 'model') {
            // Initialize model_config structure
            const existingValue = props.modelValue[field.name]
            if (existingValue && typeof existingValue === 'object') {
              // 支持旧格式（数组）和新格式（字典）
              let featureConfig = existingValue.feature_config
              data[field.name] = {
                model_id: existingValue.model_id || null,
                model_path: existingValue.model_path || null,
                feature_config: featureConfig
              }
            } else {
              data[field.name] = {
                model_id: null,
                model_path: null,
                feature_config: { factors: [], encoder_classes: null }
              }
            }
            // Initialize feature config text
            featureConfigText.value[field.name] = JSON.stringify(data[field.name].feature_config, null, 2)
            // Load models list
            loadModels(field.name)
          } else {
            data[field.name] = props.modelValue[field.name] !== undefined
              ? props.modelValue[field.name]
              : field.default !== undefined
                ? field.default
                : ''
          }
        }
      })
      return data
    }

    const formData = ref(getInitialFormData())

    // 只在 fields 变化时重置 formData
    watch(
      () => props.fields,
      () => {
        formData.value = getInitialFormData()
        emit('update:modelValue', { ...formData.value })
      },
      { immediate: true, deep: true }
    )

    // 只在 modelValue 变化时，合并新值到 formData，不要全量重置
    watch(
      () => props.modelValue,
      (val) => {
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(key => {
            formData.value[key] = val[key]
            // 如果是 model 类型，同步更新 feature_config 文本和确保结构完整
            const field = props.fields.find(f => f.name === key && f.type === 'model')
            if (field && val[key]) {
              // 确保 model_config 结构完整
              if (!formData.value[key].model_path && val[key].model_id) {
                // 如果有 model_id 但没有 model_path，尝试加载
                onModelChange(key, val[key].model_id)
              } else if (val[key].feature_config) {
                featureConfigText.value[key] = JSON.stringify(val[key].feature_config, null, 2)
              }
            }
          })
        }
      }
    )

    // 监听 formData 变化，emit，不要再赋值 array 字段，避免递归
    watch(
      formData,
      (val) => {
        emit('update:modelValue', { ...val })
      },
      { deep: true }
    )

    const handleSubmit = () => {
      // Implement the submit logic here
    }

    const addArrayItem = (fieldName) => {
      if (!formData.value[fieldName]) {
        formData.value[fieldName] = []
      }
      formData.value[fieldName].push('')
    }

    const removeArrayItem = (fieldName, index) => {
      formData.value[fieldName].splice(index, 1)
    }

    // getArrayProxy 负责过滤和去重
    const getArrayProxy = (fieldName) => computed({
      get() {
        const arr = Array.isArray(formData.value[fieldName]) ? formData.value[fieldName] : []
        return Array.from(new Set(arr.filter(i => !!i && i.trim() !== '')))
      },
      set(val) {
        formData.value[fieldName] = Array.from(new Set(val.filter(i => !!i && i.trim() !== '')))
      }
    })

    const handleArrayInputChange = (fieldName) => {
      nextTick(() => {
        // 直接用 getCurrentInstance().proxy.$refs 获取 el-select 实例
        const instance = getCurrentInstance();
        if (instance && instance.proxy && instance.proxy.$refs) {
          const selectRef = instance.proxy.$refs[`arrayRef-${fieldName}`];
          if (selectRef && selectRef.inputValue !== undefined) {
            selectRef.inputValue = '';
          }
        }
      })
    }

    const floatReg = /^-?(\\d+)?(\\.\\d*)?$/;

    function handleFloatInput(e, fieldName, fieldType) {
      if (fieldType === 'float') {
        let val = e.target.value;
        if (val === '' || /^-?(\\d+)?(\\.\\d*)?$/.test(val)) {
        } else {
            // 1. 只保留数字、.、-，负号只允许第一个字符
            val = val.replace(/[^0-9\.\-]/g, '');
            // 2. 负号只允许开头
            if (val.startsWith('-')) {
              val = '-' + val.slice(1).replace(/-/g, '');
            } else {
              val = val.replace(/-/g, '');
            }
            // 3. 只保留第一个小数点
            const firstDot = val.indexOf('.');
            if (firstDot !== -1) {
              // 只保留第一个小数点，后面的都去掉
              val = val.substring(0, firstDot + 1) + val.substring(firstDot + 1).replace(/\./g, '');
            }
            formData.value[fieldName] = val;
        }
      }
    }

    // chunk 函数用于分组checkbox
    function chunk(arr, size) {
      const res = []
      for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size))
      }
      return res
    }

    function shouldDisable(field) {
      // 只有required且choices.length===1时禁用
      return (
        (field.type === 'select' || field.type === 'radio') &&
        field.required &&
        Array.isArray(field.choices) &&
        field.choices.length === 1
      )
    }

    // Model config related functions
    async function loadModels(fieldName) {
      if (availableModels.value[fieldName]) {
        return // Already loaded
      }
      loadingModels.value[fieldName] = true
      try {
        const { data } = await getModels({ page: 1, size: 1000 })
        availableModels.value[fieldName] = data.items || data || []
      } catch (error) {
        console.error('Failed to load models:', error)
        ElMessage.error('加载模型列表失败')
        availableModels.value[fieldName] = []
      } finally {
        loadingModels.value[fieldName] = false
      }
    }

    function getModelConfig(fieldName) {
      if (!formData.value[fieldName]) {
        formData.value[fieldName] = {
          model_id: null,
        model_path: null,
        feature_config: { factors: [], encoder_classes: null }
      }
      }
      return formData.value[fieldName]
    }

    async function onModelChange(fieldName, modelId) {
      if (!modelId) {
        getModelConfig(fieldName).feature_config = { factors: [], encoder_classes: null }
        getModelConfig(fieldName).model_path = null
        featureConfigText.value[fieldName] = '{"factors": [], "encoder_classes": null}'
        jsonError.value[fieldName] = null
        return
      }

      try {
        const { data } = await getModel(modelId)
        // feature_config 现在是字典格式：{'factors': [...], 'encoder_classes': {...}}
        const featureConfig = data.feature_config || { factors: [], encoder_classes: null }
        const modelConfig = getModelConfig(fieldName)
        modelConfig.feature_config = featureConfig
        modelConfig.model_path = data.file_path  // 自动保存 model_path
        featureConfigText.value[fieldName] = JSON.stringify(featureConfig, null, 2)
        jsonError.value[fieldName] = null
        ElMessage.success('已加载模型的特征配置')
      } catch (error) {
        console.error('Failed to load model:', error)
        ElMessage.error('加载模型详情失败')
      }
    }

    function onFeatureConfigBlur(fieldName) {
      try {
        const text = featureConfigText.value[fieldName] || '{"factors": [], "encoder_classes": null}'
        const parsed = JSON.parse(text)
        // 支持字典格式：{'factors': [...], 'encoder_classes': {...}}
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          // 确保有 factors 字段
          if (!parsed.factors) {
            parsed.factors = []
          }
          getModelConfig(fieldName).feature_config = parsed
        } else if (Array.isArray(parsed)) {
          // 向后兼容：如果是数组，转换为字典格式
          getModelConfig(fieldName).feature_config = { factors: parsed, encoder_classes: null }
        } else {
          throw new Error('特征配置必须是对象格式（包含 factors 和 encoder_classes）或数组格式')
        }
        jsonError.value[fieldName] = null
      } catch (error) {
        jsonError.value[fieldName] = `JSON 格式错误: ${error.message}`
      }
    }

    function formatJSON(fieldName) {
      try {
        const text = featureConfigText.value[fieldName] || '{"factors": [], "encoder_classes": null}'
        const parsed = JSON.parse(text)
        featureConfigText.value[fieldName] = JSON.stringify(parsed, null, 2)
        jsonError.value[fieldName] = null
        ElMessage.success('格式化成功')
      } catch (error) {
        jsonError.value[fieldName] = `JSON 格式错误: ${error.message}`
        ElMessage.error('JSON 格式错误，无法格式化')
      }
    }

    function validateJSON(fieldName) {
      try {
        const text = featureConfigText.value[fieldName] || '{"factors": [], "encoder_classes": null}'
        const parsed = JSON.parse(text)
        // 支持字典格式和数组格式（向后兼容）
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          if (!parsed.factors) {
            throw new Error('特征配置对象必须包含 factors 字段')
          }
        } else if (!Array.isArray(parsed)) {
          throw new Error('特征配置必须是对象格式（包含 factors 和 encoder_classes）或数组格式')
        }
        jsonError.value[fieldName] = null
        ElMessage.success('JSON 格式正确')
      } catch (error) {
        jsonError.value[fieldName] = `JSON 格式错误: ${error.message}`
        ElMessage.error(`JSON 格式错误: ${error.message}`)
      }
    }

    function copyFeatureConfig(fieldName) {
      const featureConfig = getModelConfig(fieldName).feature_config
      // 支持新格式（字典）和旧格式（数组）
      const hasFactors = featureConfig && (
        (Array.isArray(featureConfig) && featureConfig.length > 0) ||
        (featureConfig.factors && featureConfig.factors.length > 0)
      )
      if (!hasFactors) {
        ElMessage.warning('特征配置为空')
        return
      }
      const text = JSON.stringify(featureConfig, null, 2)
      navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('已复制到剪贴板')
      }).catch(() => {
        ElMessage.error('复制失败')
      })
    }

    function viewModelDetail(fieldName) {
      const modelId = getModelConfig(fieldName).model_id
      if (!modelId) {
        ElMessage.warning('请先选择模型')
        return
      }
      // Open model detail in new window or navigate
      window.open(`/model/models?id=${modelId}`, '_blank')
    }

    return {
      formData,
      handleSubmit,
      addArrayItem,
      removeArrayItem,
      getArrayProxy,
      handleArrayInputChange,
      handleFloatInput,
      shouldDisable,
      chunk,
      // Model config
      availableModels,
      loadingModels,
      featureConfigText,
      jsonError,
      getModelConfig,
      onModelChange,
      onFeatureConfigBlur,
      formatJSON,
      validateJSON,
      copyFeatureConfig,
      viewModelDetail
    }
  }
}
</script>

<style scoped>
.dynamic-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 0 20px 0;
  margin-left: 24px;
}

.form-group.row {
  margin-bottom: 1.2rem;
}
.form-row {
  display: flex;
  align-items: center;
}
.col-label {
  min-width: 140px;
  max-width: 200px;
  font-weight: 500;
  color: #333;
  margin-right: 12px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.col-input {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.desc-tip {
  display: inline-block;
  margin-left: 4px;
  color: #999;
  background: #f5f5f5;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
  line-height: 18px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #e0e0e0;
}
.desc-tip:hover {
  color: #409eff;
  border-color: #409eff;
  background: #e6f7ff;
}
.required {
  color: red;
  margin-left: 4px;
}
.form-control,
.form-select {
  width: 100%;
  max-width: 260px;
  box-sizing: border-box;
  text-align: left;
}

.form-check {
  margin-bottom: 0.5rem;
}

.form-check-input {
  margin-right: 0.5rem;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 16px;
  align-items: center;
}
.form-check {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}

.array-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.array-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.form-actions {
  margin-top: 1.5rem;
}

.btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  border: 1px solid #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  border: 1px solid #6c757d;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  border: 1px solid #dc3545;
  color: white;
}

.checkbox-multiline-table {
  display: table;
  width: 100%;
}
.checkbox-multiline-row {
  display: table-row;
}
.checkbox-multiline-label {
  display: table-cell;
  min-width: 140px;
  max-width: 200px;
  text-align: right;
  padding-right: 12px;
  vertical-align: top;
}
.checkbox-multiline-group {
  display: table-cell;
  vertical-align: top
}

.checkbox-multicol {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 24px;
}

.model-config-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-selector {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.model-selector .el-select {
  flex: 1;
}

.model-actions {
  display: flex;
  gap: 8px;
}

.feature-config-editor {
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.json-editor {
  width: 100%;
}

.json-editor :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.json-error {
  margin-top: 8px;
  color: #f56c6c;
  font-size: 12px;
}
</style> 