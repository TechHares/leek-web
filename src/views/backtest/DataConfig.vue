<template>
  <div class="card-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据配置</span>
          <div>
            <el-button type="primary" @click="openCreate">新增</el-button>
          </div>
        </div>
      </template>

      <el-table :data="list || []" style="width: 100%" border v-loading="loading">
        <el-table-column prop="id" label="ID" width="90" align="center" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column label="数据源类型" min-width="220">
          <template #default="scope">
            {{ getTemplateDisplayName(scope.row.class_name) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" />
        <el-table-column label="创建时间" width="180" align="center">
          <template #default="scope">{{ formatDate(scope.row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="scope">
            <el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="onDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增数据配置' : '编辑数据配置'" width="800px">
      <el-form label-width="120px" class="config-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="可选" />
        </el-form-item>
        <el-form-item label="数据源类型">
          <el-select v-model="form.class_name" placeholder="请选择数据源类型" @change="onTemplateChange" filterable>
            <el-option v-for="tpl in datasourceTemplates" :key="tpl.cls" :label="tpl.name" :value="tpl.cls" />
          </el-select>
        </el-form-item>
        <el-form-item label="参数">
          <DynamicForm v-if="selectedTemplate" :fields="selectedTemplate.parameters" v-model:modelValue="form.params" :key="dynamicFormKey" />
          <div v-else style="color:#b0b3b8">请选择数据源以填写参数</div>
        </el-form-item>
        <el-divider />
        <el-form-item label="市场">
          <el-input v-model="form.extra.market" placeholder="如 okx" />
        </el-form-item>
        <el-form-item label="计价币种">
          <el-input v-model="form.extra.quote_currency" placeholder="如 USDT/CNY" />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-select v-model="form.extra.ins_type" placeholder="请选择产品类型">
            <el-option v-for="(label, val) in insTypeOptions" :key="val" :label="label" :value="Number(val)" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间周期">
          <el-select v-model="form.extra.timeframes" multiple placeholder="请选择时间周期">
            <el-option v-for="tf in timeframeOptions" :key="tf.value" :label="tf.label" :value="tf.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="交易标的">
          <el-select v-model="symbolInput" multiple filterable allow-create default-first-option placeholder="输入后回车添加">
            <el-option v-for="s in symbolInput" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import DynamicForm from '@/components/DynamicForm.vue'
import { getDataSourceTemplates } from '@/api/datasource'
import { createBacktestConfig, listBacktestConfigs, updateBacktestConfig, deleteBacktestConfig } from '@/api/backtest'
import { TradeInsType, insTypeDesc } from '@/utils/enum'

export default {
  name: 'BacktestDataConfig',
  components: { DynamicForm },
  data() {
    return {
      list: [],
      loading: false,
      dialogVisible: false,
      dialogMode: 'create', // create | edit
      editingId: null,
      datasourceTemplates: [],
      form: {
        name: '',
        remark: '',
        type: 'data',
        class_name: '',
        params: {},
        extra: { market: '', quote_currency: '', ins_type: undefined, timeframes: [], symbols: [] }
      },
      selectedTemplate: null,
      dynamicFormKey: 0,
      symbolInput: [],
      insTypeOptions: {
        [TradeInsType.SPOT]: insTypeDesc(TradeInsType.SPOT),
        [TradeInsType.MARGIN]: insTypeDesc(TradeInsType.MARGIN),
        [TradeInsType.SWAP]: insTypeDesc(TradeInsType.SWAP),
        [TradeInsType.FUTURES]: insTypeDesc(TradeInsType.FUTURES),
        [TradeInsType.OPTION]: insTypeDesc(TradeInsType.OPTION)
      },
      timeframeOptions: [
        { value: 'M1', label: '1分钟' },
        { value: 'M5', label: '5分钟' },
        { value: 'M15', label: '15分钟' },
        { value: 'M30', label: '30分钟' },
        { value: 'H1', label: '1小时' },
        { value: 'H4', label: '4小时' },
        { value: 'D1', label: '1天' }
      ]
    }
  },
  async created() {
    await this.loadTemplates()
    await this.loadConfigs()
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    async loadTemplates() {
      try {
        const { data } = await getDataSourceTemplates({ just_backtest: true })
        this.datasourceTemplates = data || []
      } catch (e) {
        this.$message.error('获取数据源模板失败')
      }
    },
    async loadConfigs() {
      this.loading = true
      try {
        const { data } = await listBacktestConfigs({ type: 'data', page: 1, size: 200 })
        this.list = data.items || []
      } catch (e) {
        this.$message.error('获取数据配置失败')
      }
      this.loading = false
    },
    getTemplateDisplayName(className) {
      const found = this.datasourceTemplates.find(t => t.cls === className)
      return found ? found.name : className
    },
    resetForm() {
      this.form = { name: '', remark: '', type: 'data', class_name: '', params: {}, extra: { market: '', quote_currency: '', ins_type: undefined, timeframes: [], symbols: [] } }
      this.symbolInput = []
      this.selectedTemplate = null
      this.dynamicFormKey++
    },
    openCreate() {
      this.dialogMode = 'create'
      this.editingId = null
      this.resetForm()
      this.dialogVisible = true
    },
    openEdit(row) {
      this.dialogMode = 'edit'
      this.editingId = row.id
      const extra = typeof row.extra === 'string' ? this.safeParse(row.extra) : (row.extra || {})
      this.form = {
        name: row.name,
        remark: row.remark || '',
        type: row.type,
        class_name: row.class_name,
        params: (typeof row.params === 'string' ? this.safeParse(row.params) : (row.params || {})),
        extra: { market: extra.market || '', quote_currency: extra.quote_currency || '', ins_type: extra.ins_type, timeframes: extra.timeframes || [], symbols: extra.symbols || [] }
      }
      this.symbolInput = [...(this.form.extra.symbols || [])]
      this.selectedTemplate = this.datasourceTemplates.find(t => t.cls === this.form.class_name) || null
      this.dynamicFormKey++
      this.dialogVisible = true
    },
    safeParse(s) {
      try { return JSON.parse(s) } catch { return {} }
    },
    onTemplateChange(val) {
      this.selectedTemplate = this.datasourceTemplates.find(t => t.cls === val)
      this.form.params = {}
      this.dynamicFormKey++
    },
    async save() {
      if (!this.form.name || !this.form.class_name) {
        this.$message.error('请填写名称并选择数据源类型')
        return
      }
      // 写回 symbols
      this.form.extra.symbols = [...this.symbolInput]
      try {
        if (this.dialogMode === 'create') {
          await createBacktestConfig(this.form)
        } else {
          await updateBacktestConfig(this.editingId, this.form)
        }
        this.$message.success('保存成功')
        this.dialogVisible = false
        this.resetForm()
        this.loadConfigs()
      } catch (e) {
        this.$message.error('保存失败')
      }
    },
    async onDelete(row) {
      try {
        await this.$confirm('确认删除该配置？', '提示', { type: 'warning' })
        await deleteBacktestConfig(row.id)
        this.$message.success('删除成功')
        this.loadConfigs()
      } catch (e) {
        if (e !== 'cancel') this.$message.error('删除失败')
      }
    }
  }
}
</script>

<style scoped>
.card-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.config-form {
  max-width: 700px;
}
</style>


