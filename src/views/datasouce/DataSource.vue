<template>
  <div class="datasource-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.name"
                placeholder="数据源名称"
                style="width: 200px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="handleCreate">
                <el-icon><Plus /></el-icon> 添加数据源
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
          <el-table-column label="类型">
            <template #default="scope">
              {{ getTemplateDisplayName(scope.row.class_name) }}
              <el-tag
                v-if="getTemplateTag(scope.row.class_name)"
                size="small"
                type="info"
                effect="plain"
                style="margin-left: 4px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
              >
                {{ formatTag(getTemplateTag(scope.row.class_name)) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="是否启用" align="center" width="100">
            <template #default="scope">
              <el-switch
                v-model="scope.row.is_enabled"
                @change="val => handleEnableChange(scope.row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="120">
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
      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="listQuery.page"
        v-model:limit="listQuery.size"
        @pagination="getList"
      />
    </el-card>
    <el-dialog
      :title="dialogStatus === 'create' ? '创建数据源' : '编辑数据源'"
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
        <el-form-item label="类型" prop="class_name">
          <el-select
            v-model="temp.class_name"
            placeholder="请选择数据源类型"
            @change="handleTemplateChange"
            filterable
            clearable
          >
            <el-option
              v-for="tpl in templates"
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
            <div v-else style="color: #b0b3b8;">请选择数据源类型后填写参数</div>
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
import { ref } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import DynamicForm from '@/components/DynamicForm.vue'
import { getDataSources, createDataSource, updateDataSource, deleteDataSource, getDataSourceTemplates } from '@/api/datasource'
import { formatTag } from '@/utils/format'

export default {
  name: 'DataSource',
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
      temp: {
        id: undefined,
        name: '',
        description: '',
        class_name: '',
        params: {}
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        class_name: [{ required: true, message: '请选择类型', trigger: 'blur' }]
      },
      templates: [],
      selectedTemplate: null,
      dynamicFormKey: 0
    }
  },
  created() {
    this.getList()
    this.getTemplates()
  },
  methods: {
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getDataSources(this.listQuery)
        this.list = data
        this.total = data.length
      } catch (error) {
        this.$message.error('获取数据源列表失败')
      }
      this.listLoading = false
    },
    async getTemplates() {
      try {
        const { data } = await getDataSourceTemplates({ project_id: this.temp.project_id })
        this.templates = data
      } catch (e) {
        this.$message.error('获取数据源模板失败')
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
      this.selectedTemplate = this.templates.find(t => t.cls === this.temp.class_name)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    async createData() {
      this.$nextTick(() => {
        this.$refs['dataForm'].validate(async (valid) => {
          if (valid) {
            try {
              await createDataSource(this.temp)
              this.dialogFormVisible = false
              this.$message.success('创建成功')
              this.getList()
            } catch (error) {
              this.$message.error('创建失败')
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
              await updateDataSource(this.temp.id, this.temp)
              this.dialogFormVisible = false
              this.$message.success('更新成功')
              this.getList()
            } catch (error) {
              this.$message.error('更新失败')
            }
          }
        })
      })
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确认删除该数据源?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteDataSource(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    handleTemplateChange(templateName) {
      this.selectedTemplate = this.templates.find(t => t.cls === templateName)
      this.temp.params = {}
      this.dynamicFormKey++
    },
    getTemplateDisplayName(className) {
      const found = this.templates.find(t => t.cls === className)
      return found ? found.name : className
    },
    getTemplateTag(className) {
      const found = this.templates.find(t => t.cls === className)
      return found ? found.tag : ''
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const pad = n => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    async handleEnableChange(row, val) {
      try {
        await updateDataSource(row.id, { is_enabled: val })
        this.$message.success(val ? '已启用' : '已禁用')
      } catch (error) {
        this.$message.error('操作失败')
        row.is_enabled = !val // 回滚
      }
    },
    formatTag(tag) {
      // Implement your formatting logic here based on the tag
      return tag;
    }
  }
}
</script>

<style lang="scss" scoped>
.datasource-page {
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
.param-scroll-area {
  max-height: 350px;
  overflow-y: auto;
  padding-right: 8px;
}
</style> 