<template>
  <div class="factor-management-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <div style="display: flex; align-items: center; gap: 12px;">
                <el-switch
                  v-model="isEnabledFilter"
                  active-text="启用"
                  inactive-text="未启用"
                  @change="handleFilter"
                />
                <el-input
                  v-model="listQuery.name"
                  placeholder="因子名称"
                  style="width: 200px;"
                  class="filter-item"
                  @keyup.enter="handleFilter"
                />
                <el-select
                  v-model="listQuery.categories"
                  multiple
                  placeholder="分类筛选"
                  clearable
                  style="width: 200px;"
                  @change="handleFilter"
                >
                  <el-option
                    v-for="option in categoryOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <el-button @click="handleFilter" :loading="listLoading">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
            </div>
            <div class="right-actions">
              <el-button
                type="primary"
                @click="handleCreate"
              >
                <el-icon><Plus /></el-icon> 创建因子
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <div v-if="listLoading" class="text-center py-4">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else>
        <el-table
          :data="list || []"
          style="width: 100%;"
          size="small"
          border
          fit
          highlight-current-row
        >
          <el-table-column align="center" label="ID" width="95">
            <template #default="scope">
              {{ scope.row.id }}
            </template>
          </el-table-column>
          <el-table-column label="名称">
            <template #default="scope">
              {{ scope.row.name }}
            </template>
          </el-table-column>
          <el-table-column label="描述">
            <template #default="scope">
              {{ getFactorName(scope.row.description) }}
            </template>
          </el-table-column>
          <el-table-column label="分类" width="150">
            <template #default="scope">
              <el-tag
                v-for="cat in (scope.row.categories || [])"
                :key="cat"
                size="small"
                :type="getCategoryType(cat)"
                style="margin-right: 4px;"
              >
                {{ getCategoryLabel(cat) }}
              </el-tag>
              <span v-if="!scope.row.categories || scope.row.categories.length === 0" style="color: #b0b3b8;">未分类</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="350">
            <template #default="scope">
              <el-tooltip content="详情" placement="top">
                <el-button
                  size="small"
                  @click="handleViewDetail(scope.row)"
                  circle
                >
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="编辑" placement="top">
                <el-button
                  size="small"
                  @click="handleUpdate(scope.row)"
                  circle
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="复制" placement="top">
                <el-button
                  size="small"
                  type="info"
                  @click="handleCopy(scope.row)"
                  circle
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="分析" placement="top">
                <el-button
                  size="small"
                  type="success"
                  @click="handleEvaluate(scope.row)"
                  circle
                >
                  <el-icon><DataAnalysis /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip v-if="!scope.row.is_enabled" content="启用" placement="top">
                <el-button
                  size="small"
                  type="primary"
                  @click="handleEnable(scope.row)"
                  circle
                >
                  <el-icon><VideoPlay /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="scope.row.is_enabled" content="禁用" placement="top">
                <el-button
                  size="small"
                  type="warning"
                  @click="handleDisable(scope.row)"
                  circle
                >
                  <el-icon><RemoveFilled /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="!scope.row.is_enabled" content="删除" placement="top">
                <el-button
                  size="small"
                  type="danger"
                  @click="handleDelete(scope.row)"
                  circle
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="listQuery.page"
        v-model:limit="listQuery.size"
        @pagination="getList"
      />
    </el-card>

    <el-dialog
      :title="dialogStatus === 'create' ? '创建因子' : '编辑因子'"
      v-model="dialogFormVisible"
      width="800px"
    >
      <el-form
        ref="dataForm"
        :rules="rules"
        :model="temp"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="temp.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="temp.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="因子模版" prop="class_name" required>
          <el-tooltip
            v-if="currentFactorDesc"
            placement="top"
            effect="light"
          >
            <template #content>
              <div v-html="currentFactorDesc" style="white-space: pre-line; max-width: 400px;"></div>
            </template>
            <el-select
              v-model="temp.class_name"
              filterable
              clearable
              @change="handleFactorTemplateChange"
            >
              <el-option
                v-for="item in factorOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <el-tooltip
                  v-if="item.desc"
                  effect="light"
                  placement="right"
                  :hide-after="0"
                >
                  <template #content>
                    <div v-html="formatDesc(item.desc)" style="white-space: pre-line; max-width: 400px;"></div>
                  </template>
                  <span>
                    {{ item.label }}
                    <el-tag
                      v-if="item.tag"
                      size="small"
                      type="info"
                      effect="plain"
                      style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                    >
                      {{ formatTag(item.tag) }}
                    </el-tag>
                  </span>
                </el-tooltip>
                <span v-else>
                  {{ item.label }}
                  <el-tag
                    v-if="item.tag"
                    size="small"
                    type="info"
                    effect="plain"
                    style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                  >
                    {{ formatTag(item.tag) }}
                  </el-tag>
                </span>
              </el-option>
            </el-select>
          </el-tooltip>
          <el-select
            v-else
            v-model="temp.class_name"
            filterable
            clearable
            @change="handleFactorTemplateChange"
          >
            <el-option
              v-for="item in factorOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
              <el-tooltip
                v-if="item.desc"
                effect="light"
                placement="right"
                :hide-after="0"
              >
                <template #content>
                  <div v-html="formatDesc(item.desc)" style="white-space: pre-line; max-width: 400px;"></div>
                </template>
                <span>
                  {{ item.label }}
                  <el-tag
                    v-if="item.tag"
                    size="small"
                    type="info"
                    effect="plain"
                    style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                  >
                    {{ formatTag(item.tag) }}
                  </el-tag>
                </span>
              </el-tooltip>
              <span v-else>
                {{ item.label }}
                <el-tag
                  v-if="item.tag"
                  size="small"
                  type="info"
                  effect="plain"
                  style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                >
                  {{ formatTag(item.tag) }}
                </el-tag>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="因子参数" prop="params">
          <div class="param-scroll-area">
            <DynamicForm
              v-if="selectedFactorTemplate && Array.isArray(selectedFactorTemplate.parameters) && selectedFactorTemplate.parameters.length > 0 && temp.class_name"
              :fields="selectedFactorTemplate.parameters"
              v-model:modelValue="temp.params"
              :key="factorParamFormKey"
            />
            <div v-else style="color: #b0b3b8;">无需参数</div>
          </div>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="temp.categories"
            multiple
            placeholder="请选择分类（可多选）"
            style="width: 100%;"
          >
            <el-option
              v-for="option in categoryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      title="因子详情"
      v-model="detailDialogVisible"
      width="900px"
    >
      <div v-if="detailData" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">
            {{ detailData.id }}
          </el-descriptions-item>
          <el-descriptions-item label="名称">
            {{ detailData.name }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ detailData.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="因子模版" :span="2">
            {{ getFactorName(detailData.class_name) }}
          </el-descriptions-item>
          <el-descriptions-item label="因子数量">
            {{ detailData.factor_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailData.is_enabled ? 'success' : 'info'" size="small">
              {{ detailData.is_enabled ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分类" :span="2">
            <el-tag
              v-for="cat in (detailData.categories || [])"
              :key="cat"
              size="small"
              :type="getCategoryType(cat)"
              style="margin-right: 4px;"
            >
              {{ getCategoryLabel(cat) }}
            </el-tag>
            <span v-if="!detailData.categories || detailData.categories.length === 0" style="color: #b0b3b8;">未分类</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(detailData.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ detailData.updated_at ? formatDate(detailData.updated_at) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="因子参数" :span="2">
            <div v-if="detailData.params && Object.keys(detailData.params).length > 0" class="params-display">
              <pre>{{ JSON.stringify(detailData.params, null, 2) }}</pre>
            </div>
            <span v-else style="color: #b0b3b8;">无参数</span>
          </el-descriptions-item>
          <el-descriptions-item label="因子名称" :span="2">
            <div v-if="detailData.output_names && detailData.output_names.length > 0" class="output-names-display">
              <el-tag
                v-for="(name, index) in detailData.output_names"
                :key="index"
                size="small"
                type="info"
                effect="plain"
                style="margin: 4px 4px 4px 0;"
              >
                {{ name }}
              </el-tag>
            </div>
            <span v-else style="color: #b0b3b8;">-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getFactors, createFactor, updateFactor, deleteFactor, enableFactor, disableFactor, getFactorTemplates } from '@/api/factor'
import Pagination from '@/components/Pagination/index.vue'
import { Plus, Edit, Delete, VideoPlay, RemoveFilled, DataAnalysis, Search, DocumentCopy, View } from '@element-plus/icons-vue'
import { formatDate, formatTag } from '@/utils/format'
import DynamicForm from '@/components/DynamicForm.vue'

export default {
  name: 'FactorManagement',
  components: { Pagination, DynamicForm },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        name: undefined
      },
      dialogFormVisible: false,
      dialogStatus: '',
      detailDialogVisible: false,
      detailData: null,
      temp: {
        id: undefined,
        name: '',
        description: '',
        class_name: '',
        params: {},
        is_enabled: false
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        class_name: [{ required: true, message: '请选择因子模板', trigger: 'change' }]
      },
      factorOptions: [],
      rawFactorTemplates: [],
      selectedFactorTemplate: null,
      factorParamFormKey: 0,
      isEnabledFilter: true,
      currentFactorDesc: '',
      categoryOptions: [
        { value: 'momentum', label: '动量因子' },
        { value: 'reversal', label: '反转因子' },
        { value: 'value', label: '价值因子' },
        { value: 'size', label: '规模因子' },
        { value: 'quality', label: '质量因子' },
        { value: 'volatility', label: '波动率因子' },
        { value: 'liquidity', label: '流动性因子' },
        { value: 'technical', label: '技术指标' },
        { value: 'time', label: '时间因子' },
        { value: 'volume', label: '价量因子' },
        { value: 'custom', label: '自定义' }
      ]
    }
  },
  created() {
    this.getList()
    this.getFactorTemplates()
  },
  methods: {
    formatDate,
    formatTag,
    formatDesc(desc) {
      if (!desc) return ''
      return desc.replace(/\n/g, '<br>')
    },
    getFactorName(className) {
      const tpl = this.rawFactorTemplates?.find(item => item.cls === className)
      return tpl ? tpl.name : className
    },
    getCategoryLabel(category) {
      const option = this.categoryOptions.find(opt => opt.value === category)
      return option ? option.label : category
    },
    getCategoryType(category) {
      const typeMap = {
        'momentum': 'success',
        'reversal': 'warning',
        'value': 'primary',
        'size': 'info',
        'quality': 'success',
        'volatility': 'warning',
        'liquidity': 'info',
        'technical': 'primary',
        'time': 'info',
        'volume': 'success',
        'custom': ''
      }
      return typeMap[category] || 'info'
    },
    async getList() {
      this.listLoading = true
      try {
        const params = {
          ...this.listQuery,
          is_enabled: this.isEnabledFilter ? 1 : 0
        }
        // 将 categories 数组转换为逗号分隔的字符串
        if (params.categories && Array.isArray(params.categories) && params.categories.length > 0) {
          params.categories = params.categories.join(',')
        } else {
          delete params.categories
        }
        const { data } = await getFactors(params)
        this.list = data
        this.total = data.length
      } catch (error) {
        console.error('获取因子列表失败:', error)
        this.$message.error('获取因子列表失败')
      }
      this.listLoading = false
    },
    async getFactorTemplates() {
      try {
        const { data } = await getFactorTemplates()
        this.rawFactorTemplates = data
        this.factorOptions = data.map(item => ({
          value: item.cls,
          label: item.name,
          desc: item.desc,
          tag: item.tag
        }))
      } catch (error) {
        console.error('获取因子模板失败:', error)
        this.$message.error('获取因子模板失败')
      }
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    resetTemp() {
      this.temp = {
        id: undefined,
        name: '',
        description: '',
        class_name: '',
        params: {},
        categories: [],
        is_enabled: false
      }
      this.selectedFactorTemplate = null
      this.currentFactorDesc = ''
      this.factorParamFormKey = 0
    },
    async handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      // 刷新因子模板列表，确保获取最新模板
      await this.getFactorTemplates()
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row)
      // 确保 categories 是数组
      if (!this.temp.categories) {
        this.temp.categories = []
      }
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.handleFactorTemplateChange(row.class_name)
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleFactorTemplateChange(class_name) {
      if (!class_name) {
        this.selectedFactorTemplate = null
        this.currentFactorDesc = ''
        this.factorParamFormKey++
        return
      }
      
      const template = this.rawFactorTemplates.find(t => t.cls === class_name)
      if (template) {
        this.selectedFactorTemplate = template
        this.currentFactorDesc = template.desc || ''
        this.factorParamFormKey++
        
        // 如果是创建，初始化参数和分类
        if (this.dialogStatus === 'create') {
          // 只有在参数为空时才重置（避免覆盖复制时的参数）
          if (!this.temp.params || Object.keys(this.temp.params).length === 0) {
            this.temp.params = {}
          }
          // 只有在分类为空时才推断分类（避免覆盖复制时的分类）
          if (!this.temp.categories || this.temp.categories.length === 0) {
            // 根据模块名和类名推断分类（仅作为默认值，用户可修改）
            const moduleName = class_name.split('|')[0] || ''
            const className = (class_name.split('|')[1] || '').toLowerCase()
            const inferredCategories = []
            
            // 时间因子
            if (moduleName.includes('time') || className.includes('time')) {
              inferredCategories.push('time')
            }
            // 技术指标
            if (moduleName.includes('technical') || ['ma', 'rsi', 'atr', 'macd', 'boll'].some(x => className.includes(x))) {
              inferredCategories.push('technical')
            }
            // Alpha因子集合通常包含多种类型，不自动分类，让用户手动选择
            
            // 如果没有推断出分类，不设置默认值，让用户手动选择
            this.temp.categories = inferredCategories.length > 0 ? inferredCategories : []
          }
        }
      }
    },
    createData() {
      this.$refs['dataForm'].validate(async (valid) => {
        if (valid) {
          try {
            await createFactor(this.temp)
            this.dialogFormVisible = false
            this.$message.success('创建成功')
            this.getList()
          } catch (error) {
            console.error('创建因子失败:', error)
            this.$message.error('创建因子失败: ' + (error.response?.data?.detail || error.message))
          }
        }
      })
    },
    updateData() {
      this.$refs['dataForm'].validate(async (valid) => {
        if (valid) {
          try {
            await updateFactor(this.temp.id, this.temp)
            this.dialogFormVisible = false
            this.$message.success('更新成功')
            this.getList()
          } catch (error) {
            console.error('更新因子失败:', error)
            this.$message.error('更新因子失败: ' + (error.response?.data?.detail || error.message))
          }
        }
      })
    },
    async handleEnable(row) {
      try {
        await enableFactor(row.id)
        this.$message.success('启用成功')
        this.getList()
      } catch (error) {
        this.$message.error('启用失败')
      }
    },
    async handleDisable(row) {
      try {
        await disableFactor(row.id)
        this.$message.success('禁用成功')
        this.getList()
      } catch (error) {
        this.$message.error('禁用失败')
      }
    },
    handleDelete(row) {
      this.$confirm('确定要删除这个因子吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await deleteFactor(row.id)
          this.$message.success('删除成功')
          this.getList()
        } catch (error) {
          this.$message.error('删除失败')
        }
      }).catch(() => {})
    },
    handleEvaluate(row) {
      // 跳转到因子分析页面，并预选该因子
      this.$router.push({
        path: '/factor_analysis/evaluation',
        query: { factor_id: row.id }
      })
    },
    handleViewDetail(row) {
      // 显示因子详情
      this.detailData = { ...row }
      this.detailDialogVisible = true
    },
    async handleCopy(row) {
      // 复制当前因子配置
      this.resetTemp()
      // 复制参数和分类（深拷贝）
      const copiedParams = row.params ? JSON.parse(JSON.stringify(row.params)) : {}
      const copiedCategories = row.categories && row.categories.length > 0 ? [...row.categories] : []
      // 设置基本信息，包括复制的参数和分类
      this.temp = {
        name: row.name,
        description: row.description || '',
        class_name: row.class_name,
        params: copiedParams,
        categories: copiedCategories,
        is_enabled: false
      }
      this.dialogStatus = 'create'
      // 刷新因子模板列表，确保获取最新模板
      await this.getFactorTemplates()
      // 调用 handleFactorTemplateChange 来初始化模板
      // 由于我们已经设置了 params 和 categories，handleFactorTemplateChange 不会重置它们
      this.handleFactorTemplateChange(row.class_name)
      this.dialogFormVisible = true
      this.$nextTick(() => {
        // 强制更新表单，确保参数正确显示
        this.factorParamFormKey++
        this.$refs['dataForm']?.clearValidate()
      })
    }
  }
}
</script>

<style scoped>
.factor-management-page {
  padding: 20px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.right-actions {
  display: flex;
  align-items: center;
}

.text-center {
  text-align: center;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.param-scroll-area {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
  width: 100%;
}

.detail-content {
  padding: 10px 0;
}

.params-display {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.params-display pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #606266;
}

.output-names-display {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
