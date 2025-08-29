<template>
  <div class="risk-policies-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.name"
                placeholder="策略名称"
                style="width: 200px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="handleCreate">
                <el-icon><Plus /></el-icon> 新增风控策略
              </el-button>
            </div>
          </div>
        </div>
      </template>
      <div v-if="listLoading" class="text-center py-4">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else>
        <el-table :data="list || []" style="width: 100%;" size="small" border fit highlight-current-row>
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
          <el-table-column label="类型">
            <template #default="scope">
              {{ getTemplateDisplayName(scope.row.class_name) }}
              <el-tag v-if="getTemplateTag(scope.row.class_name)" size="small" type="info" effect="plain" style="margin-left: 4px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                {{ formatTag(getTemplateTag(scope.row.class_name)) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="适用范围">
            <template #default="scope">
              <el-tag size="small" type="success" v-if="scope.row.scope === 'all'">全部</el-tag>
              <span v-else>
                <el-tag v-if="scope.row.scope==='strategy_templates'" size="small" type="info">策略模板: {{ (scope.row.strategy_template_ids||[]).length }}</el-tag>
                <el-tag v-if="scope.row.scope==='strategy_instances'" size="small" type="warning">策略实例: {{ (scope.row.strategy_instance_ids||[]).length }}</el-tag>
                <el-tag v-if="scope.row.scope==='mixed'" size="small" type="primary">混合</el-tag>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="是否启用" align="center" width="100">
            <template #default="scope">
              <el-switch v-model="scope.row.is_enabled" @change="val => handleEnableChange(scope.row, val)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="140">
            <template #default="scope">
              <el-button size="small" @click="handleUpdate(scope.row)" circle>
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(scope.row)" circle>
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination v-show="total > 0" :total="total" v-model:page="listQuery.page" v-model:limit="listQuery.size" @pagination="getList" />
    </el-card>

    <el-dialog :title="dialogStatus === 'create' ? '创建风控策略' : '编辑风控策略'" v-model="dialogFormVisible" width="780px">
      <el-form ref="dataForm" :rules="rules" :model="temp" label-position="right" label-width="120px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="temp.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="temp.description" type="textarea" />
        </el-form-item>
        <el-form-item label="类型" prop="class_name">
          <el-select v-model="temp.class_name" placeholder="请选择风控策略类型" @change="handleTemplateChange" filterable clearable>
            <el-option v-for="tpl in templates" :key="tpl.cls" :label="tpl.name" :value="tpl.cls">
              <span>{{ tpl.name }}</span>
              <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                {{ formatTag(tpl.tag) }}
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="参数" prop="params">
          <div class="param-scroll-area">
            <DynamicForm ref="dynamicForm" v-if="selectedTemplate && temp.class_name" :fields="selectedTemplate.parameters" v-model:modelValue="temp.params" :key="dynamicFormKey" />
            <div v-else style="color: #b0b3b8;">请选择风控策略类型后填写参数</div>
          </div>
        </el-form-item>

        <el-form-item label="适用策略" prop="scope">
          <el-radio-group v-model="temp.scope">
            <el-radio :value="'all'">全部</el-radio>
            <el-radio :value="'strategy_templates'">策略模版</el-radio>
            <el-radio :value="'strategy_instances'">策略实例</el-radio>
            <el-radio :value="'mixed'">混合</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="temp.scope==='strategy_templates' || temp.scope==='mixed'" label="选择模版">
          <el-select v-model="temp.strategy_template_ids" multiple filterable placeholder="选择策略模版">
            <el-option v-for="s in strategyTemplates" :key="s.cls" :label="s.name" :value="s.cls" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="temp.scope==='strategy_instances' || temp.scope==='mixed'" label="选择策略实例">
          <el-select v-model="temp.strategy_instance_ids" multiple filterable placeholder="选择策略实例">
            <el-option v-for="i in strategyInstances" :key="i.id" :label="i.name" :value="i.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="text-end">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import Pagination from '@/components/Pagination/index.vue'
import DynamicForm from '@/components/DynamicForm.vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getRiskPolicies, createRiskPolicy, updateRiskPolicy, deleteRiskPolicy } from '@/api/risk'
import { getStrategyTemplates, getStrategyInstances } from '@/api/strategy'
import { getPolicyTemplates } from '@/api/position'

export default {
  name: 'RiskPolicies',
  components: { Pagination, DynamicForm },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: { page: 1, size: 20, name: undefined },
      dialogFormVisible: false,
      dialogStatus: '',
      temp: {
        id: undefined,
        name: '',
        description: '',
        class_name: '',
        params: {},
        scope: 'all',
        strategy_template_ids: [],
        strategy_instance_ids: []
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        class_name: [{ required: true, message: '请选择类型', trigger: 'change' }],
        scope: [{ required: true, message: '请选择适用范围', trigger: 'change' }]
      },
      templates: [],
      strategyTemplates: [],
      strategyInstances: [],
      selectedTemplate: null,
      dynamicFormKey: 0
    }
  },
  created() {
    this.getList()
    this.getTemplates()
    this.loadStrategyOptions()
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getRiskPolicies(this.listQuery)
        this.list = data
        this.total = data.length
      } catch (e) { this.$message.error('获取风控策略失败') }
      this.listLoading = false
    },
    async getTemplates() {
      try {
        const { data } = await getPolicyTemplates()
        this.templates = data
      } catch (e) { this.$message.error('获取风控模板失败') }
    },
    async loadStrategyOptions() {
      try {
        const [tplRes, instRes] = await Promise.all([
          getStrategyTemplates(),
          getStrategyInstances()
        ])
        this.strategyTemplates = tplRes.data
        const items = []
        for (const row of instRes.data || []) {
          items.push({ id: `${row.strategy_id}`, name: `${row.strategy_name}` })
        }
        this.strategyInstances = items
      } catch (e) {}
    },
    handleFilter() { this.listQuery.page = 1; this.getList() },
    resetTemp() {
      this.temp = { id: undefined, name: '', description: '', class_name: '', params: {}, scope: 'all', strategy_template_ids: [], strategy_instance_ids: [] }
      this.dynamicFormKey++
    },
    handleCreate() { this.resetTemp(); this.dialogStatus = 'create'; this.dialogFormVisible = true; this.$nextTick(() => { this.$refs['dataForm'].clearValidate() }) },
    handleUpdate(row) {
      this.temp = Object.assign({}, row)
      if (typeof this.temp.params === 'string') { try { this.temp.params = JSON.parse(this.temp.params) } catch { this.temp.params = {} } }
      if (!this.temp.params || typeof this.temp.params !== 'object') { this.temp.params = {} }
      this.selectedTemplate = this.templates.find(t => t.cls === this.temp.class_name)
      this.dialogStatus = 'update'; this.dialogFormVisible = true; this.$nextTick(() => { this.$refs['dataForm'].clearValidate() })
    },
    async createData() {
      this.$nextTick(() => {
        this.$refs['dataForm'].validate(async (valid) => {
          if (valid) {
            try {
              await createRiskPolicy(this.temp)
              this.dialogFormVisible = false
              this.$message.success('创建成功')
              this.getList()
            } catch (e) { this.$message.error('创建失败') }
          }
        })
      })
    },
    async updateData() {
      this.$nextTick(() => {
        this.$refs['dataForm'].validate(async (valid) => {
          if (valid) {
            try {
              await updateRiskPolicy(this.temp.id, this.temp)
              this.dialogFormVisible = false
              this.$message.success('更新成功')
              this.getList()
            } catch (e) { this.$message.error('更新失败') }
          }
        })
      })
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确认删除该风控策略?', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
        await deleteRiskPolicy(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) { if (error !== 'cancel') { this.$message.error('删除失败') } }
    },
    async handleEnableChange(row, val) {
      try {
        await updateRiskPolicy(row.id, { is_enabled: val })
        this.$message.success(val ? '已启用' : '已禁用')
      } catch (e) { this.$message.error('操作失败'); row.is_enabled = !val }
    },
    handleTemplateChange(templateName) { this.selectedTemplate = this.templates.find(t => t.cls === templateName); this.temp.params = {}; this.dynamicFormKey++ },
    getTemplateDisplayName(className) { const found = this.templates.find(t => t.cls === className); return found ? found.name : className },
    getTemplateTag(className) { const found = this.templates.find(t => t.cls === className); return found ? found.tag : '' },
    formatTag(tag) { return tag }
  }
}
</script>

<style lang="scss" scoped>
.risk-policies-page { padding: 20px; }
.el-card { margin-bottom: 20px; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05); border-radius: 12px; }
.header-bar { .table-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; } .left-actions { display: flex; gap: 8px; } .right-actions { display: flex; justify-content: flex-end; flex: 1; } }
.filter-item { margin-right: 8px; }
.text-center { text-align: center; }
.text-end { text-align: right; }
.py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.param-scroll-area { max-height: 350px; overflow-y: auto; padding-right: 8px; }
</style>

