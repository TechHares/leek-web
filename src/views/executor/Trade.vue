<template>
  <div class="executor-trade-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.name"
                placeholder="执行器名称"
                style="width: 200px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
            </div>
            <div class="right-actions">
              <el-button
                type="primary"
                @click="handleCreate"
              >
                <el-icon><Plus /></el-icon> 添加执行器
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
          <el-table-column label="执行器" prop="class_name">
            <template #default="{ row }">
              {{ getExecutorDisplayName(row.class_name) }}
              <el-tag
                v-if="getExecutorTag(row.class_name)"
                size="small"
                type="info"
                effect="plain"
                style="margin-left: 4px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
              >
                {{ formatTag(getExecutorTag(row.class_name)) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="启用" align="center" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.is_enabled"
                :active-value="true"
                :inactive-value="false"
                @change="handleEnabledChange(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="120">
            <template #default="scope">
              <el-button
                size="small"
                @click="handleUpdate(scope.row)"
                circle
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.row)"
                circle
              >
                <el-icon><Delete /></el-icon>
              </el-button>
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
      :title="dialogStatus === 'create' ? '创建执行器' : '编辑执行器'"
      v-model="dialogFormVisible"
      width="700px"
    >
      <el-form
        ref="dataForm"
        :rules="rules"
        :model="temp"
        label-position="right"
        label-width="100px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="temp.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="temp.description" type="textarea" />
        </el-form-item>
        <el-form-item label="执行器" prop="class_name">
          <el-select
            v-model="temp.class_name"
            placeholder="请选择执行器"
            @change="handleTemplateChange"
            filterable
            clearable
          >
            <el-option
              v-for="tpl in executorTemplates"
              :key="tpl.cls"
              :label="tpl.name"
              :value="tpl.cls"
            >
              <span>{{ tpl.name }}</span>
              <el-tag
                v-if="tpl.tag"
                size="small"
                type="info"
                effect="plain"
                style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
              >
                {{ formatTag(tpl.tag) }}
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="参数" prop="params">
          <div class="param-scroll-area">
            <DynamicForm
              ref="dynamicForm"
              v-if="selectedTemplate && temp.class_name"
              :fields="selectedTemplate.parameters"
              v-model:modelValue="temp.params"
              :key="dynamicFormKey"
            />
            <div v-else style="color: #b0b3b8;">请选择执行器后填写参数</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="text-end">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getExecutors, createExecutor, updateExecutor, deleteExecutor, getExecutorTemplates } from '@/api/executor'
import { getProjects } from '@/api/project'
import Pagination from '@/components/Pagination/index.vue'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import DynamicForm from '@/components/DynamicForm.vue'
import { formatTag } from '@/utils/format'

export default {
  name: 'ExecutorTrade',
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
      projectOptions: [], // 项目选项
      dialogFormVisible: false,
      dialogStatus: '',
      temp: {
        id: undefined,
        name: '',
        description: '',
        class_name: '',
        project_id: undefined,
        params: {}
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        class_name: [{ required: true, message: '请输入类名', trigger: 'blur' }],
        project_id: [{ required: true, message: '请选择项目', trigger: 'change' }]
      },
      executorTemplates: [],
      selectedTemplate: null,
      dynamicFormKey: 0
    }
  },
  created() {
    this.getList()
    this.getExecutorTemplates()
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getExecutors(this.listQuery)
        this.list = data
        this.total = data.length
      } catch (error) {
        console.error('获取执行器列表失败:', error)
        this.$message.error('获取执行器列表失败')
      }
      this.listLoading = false
    },
    async getExecutorTemplates() {
      try {
        const { data } = await getExecutorTemplates({ project_id: this.temp.project_id })
        this.executorTemplates = data
      } catch (e) {
        this.$message.error('获取执行器模板失败')
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
        project_id: undefined,
        params: {}
      }
      this.dynamicFormKey++
    },
    handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row)
      if (typeof this.temp.params === 'string') {
        try {
          this.temp.params = JSON.parse(this.temp.params)
        } catch {
          this.temp.params = {}
        }
      }
      if (!this.temp.params || typeof this.temp.params !== 'object') {
        this.temp.params = {}
      }
      this.selectedTemplate = this.executorTemplates.find(t => t.cls === this.temp.class_name)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    async createData() {
      // 移除对子组件submit的调用，参数已自动同步
      this.$nextTick(() => {
        this.$refs['dataForm'].validate(async (valid) => {
          if (valid) {
            try {
              const tempData = Object.assign({}, this.temp)
              await createExecutor(tempData)
              this.dialogFormVisible = false
              this.$message.success('创建成功')
              this.getList()
            } catch (error) {
              console.error('创建执行器失败:', error)
              this.$message.error('创建执行器失败')
            }
          }
        })
      })
    },
    async updateData() {
      this.$nextTick(() => {
        this.$refs['dataForm'].validate(async (valid) => {
          if (valid) {
            try {
              const tempData = Object.assign({}, this.temp, { params: { ...this.temp.params } })
              console.log('提交参数', tempData.params)
              await updateExecutor(tempData.id, tempData)
              this.dialogFormVisible = false
              this.$message.success('更新成功')
              this.getList()
            } catch (error) {
              console.error('更新执行器失败:', error)
              this.$message.error('更新执行器失败')
            }
          }
        })
      })
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确认删除该执行器?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteExecutor(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除执行器失败:', error)
          this.$message.error('删除执行器失败')
        }
      }
    },
    handleTemplateChange(templateName) {
      this.selectedTemplate = this.executorTemplates.find(t => t.cls === templateName)
      this.temp.params = {}
      this.dynamicFormKey++
    },
    getExecutorDisplayName(className) {
      const found = this.executorTemplates.find(t => t.cls === className)
      return found ? found.name : className
    },
    handleEnabledChange(row) {
      // 只更新is_enabled字段，其他字段保持原值
      updateExecutor(row.id, { is_enabled: row.is_enabled })
        .then(() => {
          this.$message.success(row.is_enabled ? '已启用' : '已禁用')
        })
        .catch(() => {
          this.$message.error('状态更新失败')
          // 回滚状态
          row.is_enabled = !row.is_enabled
        })
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    getExecutorTag(className) {
      const found = this.executorTemplates.find(t => t.cls === className)
      return found ? found.tag : ''
    },
    formatTag(tag) {
      // Implement your formatting logic here based on the tag
      return tag;
    }
  }
}
</script>

<style lang="scss" scoped>
.executor-trade-page {
  padding: 20px;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}
.header-bar {
  .table-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .left-actions {
    display: flex;
    gap: 8px;
  }
  .right-actions {
    display: flex;
    justify-content: flex-end;
    flex: 1;
  }
}
.filter-item {
  margin-right: 8px;
}
.text-center {
  text-align: center;
}
.text-end {
  text-align: right;
}
.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
.mb-0 {
  margin-bottom: 0;
}
.executor-desc {
  color: #b0b3b8;
  font-size: 13px;
  margin-left: 2px;
}
.text-muted {
  color: #b0b3b8;
}
.el-table {
  font-size: 14px;
}
.param-scroll-area {
  max-height: 350px; /* 你可以根据实际情况调整高度 */
  overflow-y: auto;
  padding-right: 8px; /* 防止滚动条遮住内容 */
}
</style> 