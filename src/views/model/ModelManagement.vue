<template>
  <div class="model-management-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="listQuery.name"
                placeholder="模型名称"
                style="width: 200px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
              <el-input
                v-model="listQuery.version"
                placeholder="版本"
                style="width: 150px;"
                class="filter-item"
                @keyup.enter="handleFilter"
              />
              <el-button @click="handleFilter" :loading="listLoading">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="handleUpload">
                <el-icon><Plus /></el-icon> 上传模型
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
          <el-table-column label="版本" width="120">
            <template #default="scope">
              {{ scope.row.version }}
            </template>
          </el-table-column>
          <el-table-column label="文件大小" width="120">
            <template #default="scope">
              {{ formatFileSize(scope.row.file_size) }}
            </template>
          </el-table-column>
          <el-table-column label="描述">
            <template #default="scope">
              {{ scope.row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="240">
            <template #default="scope">
              <el-tooltip content="查看详情" placement="top">
                <el-button size="small" type="info" @click="handleViewDetail(scope.row)" circle>
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="下载模型文件" placement="top">
                <el-button size="small" type="primary" @click="handleDownload(scope.row)" circle>
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="复制特征配置" placement="top">
                <el-button 
                  size="small" 
                  type="success" 
                  @click="handleCopyFeatureConfig(scope.row)"
                  :disabled="!scope.row.feature_config || !scope.row.feature_config.factors || scope.row.feature_config.factors.length === 0"
                  circle
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除模型" placement="top">
                <el-button size="small" type="danger" @click="handleDelete(scope.row)" circle>
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
    <el-dialog title="上传模型" v-model="uploadDialogVisible" width="600px">
      <el-form
        ref="uploadForm"
        :rules="uploadRules"
        :model="uploadForm"
        label-position="right"
        label-width="100px"
      >
        <el-form-item label="模型文件" prop="file">
          <el-upload ref="upload" :auto-upload="false" :on-change="handleFileChange" :limit="1">
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">仅支持 .joblib 格式</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="uploadForm.name" />
        </el-form-item>
        <el-form-item label="版本" prop="version">
          <el-input v-model="uploadForm.version" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="uploadForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="特征配置">
          <div class="feature-config-upload">
            <div class="editor-header">
              <span>特征配置 (JSON)</span>
              <div class="editor-actions">
                <el-button size="small" @click="formatUploadJSON">格式化</el-button>
                <el-button size="small" @click="validateUploadJSON">验证</el-button>
              </div>
            </div>
            <el-input
              v-model="uploadForm.feature_config_text"
              type="textarea"
              :rows="10"
              placeholder='请输入特征配置 JSON，例如: [{"id": 1, "name": "factor1", "class_name": "model|Factor", "params": {}}]'
              @blur="onUploadFeatureConfigBlur"
              class="json-editor"
            />
            <div v-if="uploadJsonError" class="json-error">
              {{ uploadJsonError }}
            </div>
            <div class="form-tip">可选，如果不填写，可在模型详情中后续添加</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="text-end">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="uploadModel" :loading="uploading">上传</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 模型详情对话框 -->
    <el-dialog title="模型详情" v-model="detailDialogVisible" width="800px">
      <div v-if="selectedModel">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ selectedModel.id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ selectedModel.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selectedModel.version }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(selectedModel.file_size) }}</el-descriptions-item>
          <el-descriptions-item label="文件路径" :span="2">
            <el-text copyable>{{ selectedModel.file_path || '-' }}</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedModel.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedModel.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(selectedModel.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 特征配置 -->
        <div v-if="selectedModel.feature_config && selectedModel.feature_config.factors && selectedModel.feature_config.factors.length > 0" style="margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4>特征配置</h4>
            <el-button size="small" type="success" @click="copyFeatureConfigFromDetail">
              <el-icon><DocumentCopy /></el-icon> 复制特征配置
            </el-button>
          </div>
          <el-input
            v-model="featureConfigDetailText"
            type="textarea"
            :rows="15"
            readonly
            class="json-editor"
          />
        </div>
        <div v-else style="margin-top: 20px;">
          <el-empty description="该模型没有特征配置" :image-size="80" />
        </div>
      </div>
      <template #footer>
        <div class="text-end">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref } from 'vue'
import { Plus, Download, Delete, Search, Refresh, DocumentCopy, View } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { getModels, getModel, deleteModel, uploadModel as uploadModelApi, downloadModel, updateModel } from '@/api/model'
import { formatDate } from '@/utils/format'

export default {
  name: 'ModelManagement',
  components: { Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        name: undefined,
        version: undefined
      },
      uploadDialogVisible: false,
      uploading: false,
      uploadForm: {
        file: null,
        name: '',
        version: '',
        description: '',
        feature_config_text: ''
      },
      uploadJsonError: null,
      detailDialogVisible: false,
      selectedModel: null,
      featureConfigDetailText: '',
      uploadRules: {
        file: [{ required: true, message: '请选择文件', trigger: 'change' }],
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        version: [{ required: true, message: '请输入版本', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    formatDate,
    formatFileSize(bytes) {
      if (!bytes) return '-'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    },
    async getList() {
      this.listLoading = true
      try {
        const { data } = await getModels(this.listQuery)
        this.list = data.items
        this.total = data.total
      } catch (error) {
        this.$message.error('获取模型列表失败')
      }
      this.listLoading = false
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleUpload() {
      this.uploadForm = {
        file: null,
        name: '',
        version: '',
        description: '',
        feature_config_text: ''
      }
      this.uploadJsonError = null
      this.uploadDialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.uploadForm) {
          this.$refs.uploadForm.clearValidate()
        }
      })
    },
    handleFileChange(file) {
      this.uploadForm.file = file.raw
    },
    async uploadModel() {
      this.$nextTick(() => {
        this.$refs.uploadForm.validate(async (valid) => {
          if (!valid) return
          if (!this.uploadForm.file) {
            this.$message.error('请选择文件')
            return
          }
          
          // 验证并解析 feature_config
          let featureConfig = null
          if (this.uploadForm.feature_config_text && this.uploadForm.feature_config_text.trim()) {
            try {
              const parsed = JSON.parse(this.uploadForm.feature_config_text.trim())
              if (!Array.isArray(parsed)) {
                this.$message.error('特征配置必须是数组格式')
                return
              }
              featureConfig = parsed
            } catch (error) {
              this.$message.error(`特征配置 JSON 格式错误: ${error.message}`)
              return
            }
          }
          
          this.uploading = true
          try {
            const { data } = await uploadModelApi(this.uploadForm.file, {
              name: this.uploadForm.name,
              version: this.uploadForm.version,
              description: this.uploadForm.description
            })
            
            // 如果提供了 feature_config，更新模型记录
            if (featureConfig && data && data.id) {
              try {
                await updateModel(data.id, {
                  feature_config: featureConfig
                })
              } catch (updateError) {
                console.error('更新特征配置失败:', updateError)
                this.$message.warning('模型上传成功，但特征配置更新失败')
              }
            }
            
            this.uploadDialogVisible = false
            this.$message.success('上传成功')
            this.getList()
          } catch (error) {
            console.error('上传失败:', error)
            this.$message.error('上传失败')
          }
          this.uploading = false
        })
      })
    },
    onUploadFeatureConfigBlur() {
      const text = this.uploadForm.feature_config_text || ''
      if (!text.trim()) {
        this.uploadJsonError = null
        return
      }
      try {
        const parsed = JSON.parse(text.trim())
        if (!Array.isArray(parsed)) {
          this.uploadJsonError = '特征配置必须是数组格式'
          return
        }
        this.uploadJsonError = null
      } catch (error) {
        this.uploadJsonError = `JSON 格式错误: ${error.message}`
      }
    },
    formatUploadJSON() {
      try {
        const text = this.uploadForm.feature_config_text || '[]'
        const parsed = JSON.parse(text.trim() || '[]')
        this.uploadForm.feature_config_text = JSON.stringify(parsed, null, 2)
        this.uploadJsonError = null
        this.$message.success('格式化成功')
      } catch (error) {
        this.uploadJsonError = `JSON 格式错误: ${error.message}`
        this.$message.error('JSON 格式错误，无法格式化')
      }
    },
    validateUploadJSON() {
      const text = this.uploadForm.feature_config_text || ''
      if (!text.trim()) {
        this.$message.warning('特征配置为空')
        return
      }
      try {
        const parsed = JSON.parse(text.trim())
        if (!Array.isArray(parsed)) {
          this.uploadJsonError = '特征配置必须是数组格式'
          this.$message.error('特征配置必须是数组格式')
          return
        }
        this.uploadJsonError = null
        this.$message.success('JSON 格式正确')
      } catch (error) {
        this.uploadJsonError = `JSON 格式错误: ${error.message}`
        this.$message.error(`JSON 格式错误: ${error.message}`)
      }
    },
    handleCopyFeatureConfig(row) {
      if (!row.feature_config || !row.feature_config.factors || row.feature_config.factors.length === 0) {
        this.$message.warning('该模型没有特征配置')
        return
      }
      const text = JSON.stringify(row.feature_config, null, 2)
      navigator.clipboard.writeText(text).then(() => {
        this.$message.success('已复制特征配置到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    },
    async handleViewDetail(row) {
      try {
        const { data } = await getModel(row.id)
        this.selectedModel = data
        if (data.feature_config && data.feature_config.factors && data.feature_config.factors.length > 0) {
          this.featureConfigDetailText = JSON.stringify(data.feature_config, null, 2)
        } else {
          this.featureConfigDetailText = ''
        }
        this.detailDialogVisible = true
      } catch (error) {
        this.$message.error('获取模型详情失败')
      }
    },
    copyFeatureConfigFromDetail() {
      if (!this.featureConfigDetailText) {
        this.$message.warning('特征配置为空')
        return
      }
      navigator.clipboard.writeText(this.featureConfigDetailText).then(() => {
        this.$message.success('已复制特征配置到剪贴板')
      }).catch(() => {
        this.$message.error('复制失败')
      })
    },
    async handleDownload(row) {
      try {
        const response = await downloadModel(row.id)
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${row.name}_${row.version}.joblib`
        link.click()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        this.$message.error('下载失败')
      }
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确认删除该模型?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteModel(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.model-management-page {
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

.feature-config-upload {
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

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.json-editor :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
</style>

