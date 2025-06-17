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
            <input
              v-else-if="field.type === 'boolean'"
              type="checkbox"
              :id="field.name"
              v-model="formData[field.name]"
              :required="field.required"
              class="form-check-input"
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
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, watch, nextTick, computed, getCurrentInstance } from 'vue'

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

    return {
      formData,
      handleSubmit,
      addArrayItem,
      removeArrayItem,
      getArrayProxy,
      handleArrayInputChange,
      handleFloatInput,
      shouldDisable,
      chunk
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
</style> 