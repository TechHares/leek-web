<template>
  <div class="strategy-page">
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
                  placeholder="策略名称"
                  style="width: 200px;"
                  class="filter-item"
                  @keyup.enter="handleFilter"
                />
              </div>
            </div>
            <div class="right-actions">
              <el-button
                type="primary"
                @click="handleCreate"
              >
                <el-icon><Plus /></el-icon> 添加策略
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
          <el-table-column label="策略名">
            <template #default="scope">
              {{ getStrategyName(scope.row.class_name) }}
            </template>
          </el-table-column>
          <el-table-column label="数据源配置">
            <template #default="{ row }">
              <template v-if="Array.isArray(row.data_source_config) && row.data_source_config.length">
                <el-tag
                  v-for="dsCfg in row.data_source_config"
                  :key="dsCfg.id || dsCfg.class_name"
                  size="small"
                  type="info"
                  effect="plain"
                  style="margin-right: 4px;"
                >
                  {{ getDataSourceName(dsCfg) }}
                </el-tag>
              </template>
              <template v-else>
                <el-tag size="small" type="info" effect="plain">未配置</el-tag>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="320">
            <template #default="scope">
              <el-tooltip content="编辑" placement="top">
                <el-button
                  size="small"
                  @click="handleUpdate(scope.row)"
                  circle
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip v-if="scope.row.is_enabled" content="查看数据" placement="top">
                <el-button
                  size="small"
                  type="primary"
                  @click="handleViewData(scope.row)"
                  circle
                >
                  <el-icon><DataAnalysis /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip v-if="scope.row.is_enabled" content="重启" placement="top">
                <el-button
                  size="small"
                  type="info"
                  @click="restartStrategy(scope.row.id)"
                  circle
                >
                <el-icon><Refresh /></el-icon>
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
              <el-tooltip content="回测" placement="top">
                <el-button
                  size="small"
                  type="success"
                  @click="handleRun(scope.row)"
                  circle
                >
                  <el-icon><Odometer /></el-icon>
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
      :title="dialogStatus === 'create' ? '创建策略' : '编辑策略'"
      v-model="dialogFormVisible"
      width="900px"
    >
      <el-form
        ref="dataForm"
        :rules="rules"
        :model="temp"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="temp.name" @focus="collapsePositionConfig" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="temp.description" @focus="collapsePositionConfig" />
        </el-form-item>
        <el-form-item label="策略" prop="class_name" required>
          <el-tooltip
            v-if="currentStrategyDesc"
            placement="top"
            effect="light"
          >
            <template #content>
              <div v-html="currentStrategyDesc" style="white-space: pre-line; max-width: 400px;"></div>
            </template>
            <el-select
              v-model="temp.class_name"
              @focus="collapsePositionConfig"
              filterable
              clearable
              @change="handleStrategyTemplateChange"
            >
              <el-option
                v-for="item in strategyOptions"
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
            @focus="collapsePositionConfig"
            filterable
            clearable
            @change="handleStrategyTemplateChange"
          >
            <el-option
              v-for="item in strategyOptions"
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
        <el-form-item label="策略参数" prop="strategy_params">
          <div class="param-scroll-area">
            <DynamicForm
              v-if="selectedStrategyTemplate && Array.isArray(selectedStrategyTemplate.parameters) && selectedStrategyTemplate.parameters.length > 0 && temp.class_name"
              :fields="selectedStrategyTemplate.parameters"
              v-model:modelValue="temp.strategy_params"
              :key="strategyParamFormKey"
            />
            <div v-else style="color: #b0b3b8;">无需参数</div>
          </div>
        </el-form-item>
        <el-form-item label="数据源" prop="selectedDataSourceCls">
          <el-row :gutter="24" style="width: 100%;">
           <!-- 数据源列表 -->
            <el-col :span="7" style="min-width: 200px;">
              <div class="data-source-list scrollable-policy-list">
              <el-checkbox-group v-model="temp.selectedDataSourceCls">
                <div
                  v-for="(ds, idx) in dataSources"
                  :key="ds.id"
                  @click="selectDataSource(idx)"
                  style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;"
                >
                  <span style="text-align: left;font-size: 14px;line-height: 20px;">{{ ds.name }}</span>
                  <el-checkbox :value="ds.id" ><span style="display:none"></span></el-checkbox>
                </div>
                <div v-if="!dataSources.length" style="color: #b0b3b8; text-align: center; margin-top: 40px;">暂无数据源</div>
              </el-checkbox-group>
              </div>
            </el-col>
            <!-- 竖线分隔符 -->
            <el-col :span="1" class="vertical-divider-col">
              <div class="vertical-divider"></div>
            </el-col>
            <!-- 数据源参数表单 -->
            <el-col :span="15">
              <div
                :class="['param-scroll-area', { 'param-disabled': isDataSourceParamDisabled }]"
                style="padding: 24px; background: #fff; border-radius: 8px; min-height: 100px;"
                v-if="currentDataSource"
              >
                <DynamicForm
                  v-if="Array.isArray(currentDataSourceParameters) && currentDataSourceParameters.length > 0"
                  :fields="currentDataSourceParameters"
                  v-model:modelValue="temp.data_source_params[currentDataSource.id]"
                  :key="currentDataSource.id"
                  :disabled="isDataSourceParamDisabled"
                />
                <div v-else style="color: #b0b3b8;">无需参数</div>
              </div>
              <div v-else style="color: #b0b3b8; padding: 24px;">请选择左侧数据源</div>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="数据处理配置">
          <el-link type="primary" @click="toggleInfoFabricatorCollapse" style="margin-left: 8px;">
            {{ infoFabricatorCollapse.includes('info_fabricator') ? '收起数据处理配置' : temp.info_fabricator_configs ? '展开数据处理配置' : '数据处理配置' }}
          </el-link>
        </el-form-item>

        <template v-if="infoFabricatorCollapse.includes('info_fabricator')">
          <div class="position-config-box" v-if="temp.info_fabricator_configs">
            <el-row :gutter="24" style="width: 100%;">
              <!-- 处理器列表 -->
              <el-col :span="7" style="min-width: 200px;">
                <div class="policy-list scrollable-policy-list">
                  <template v-for="(tpl, idx) in infoFabricatorTemplates" :key="tpl.name">
                    <div
                      @click="selectInfoFabricator(idx)"
                      :class="{active: idx === selectedInfoFabricatorIdx}"
                      style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 8px;"
                    >
                      <el-tooltip v-if="tpl.desc" effect="light" placement="left" :hide-after="0">
                        <template #content>
                          <div v-html="formatDesc(tpl.desc)" style="white-space: pre-line; max-width: 400px;"></div>
                        </template>
                        <span>
                          {{ tpl.name }}
                          <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                            {{ formatTag(tpl.tag) }}
                          </el-tag>
                        </span>
                      </el-tooltip>
                      <span v-else>
                        {{ tpl.name }}
                        <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                          {{ formatTag(tpl.tag) }}
                        </el-tag>
                      </span>
                      <el-switch
                        :model-value="isInfoFabricatorEnabled(tpl.cls)"
                        @update:model-value="val => setInfoFabricatorEnabled(tpl.cls, val)"
                        @click.stop
                      />
                    </div>
                  </template>
                  <div v-if="!infoFabricatorTemplates.length" style="color: #b0b3b8; text-align: center; margin-top: 40px;">暂无处理器</div>
                </div>
              </el-col>
              <!-- 竖线分隔符 -->
              <el-col :span="1" class="vertical-divider-col">
                <div class="vertical-divider"></div>
              </el-col>
              <!-- 处理器参数表单 -->
              <el-col :span="15">
                <div
                  v-if="currentInfoFabricatorTemplate"
                  :class="{ 'param-disabled': !isInfoFabricatorEnabled(currentInfoFabricatorTemplate.cls) }"
                  style="padding: 24px; background: #fff; border-radius: 8px; min-height: 180px;"
                >
                  <DynamicForm
                    v-if="Array.isArray(currentInfoFabricatorTemplate.parameters) && currentInfoFabricatorTemplate.parameters.length > 0"
                    :fields="currentInfoFabricatorTemplate.parameters || []"
                    v-model:modelValue="currentInfoFabricatorParams"
                    :key="currentInfoFabricatorTemplate.name"
                    :disabled="!isInfoFabricatorEnabled(currentInfoFabricatorTemplate.cls)"
                  />
                  <div v-else style="color: #b0b3b8;">无需参数</div>
                </div>
                <div v-else style="color: #b0b3b8; padding: 24px;">请选择左侧处理器</div>
              </el-col>
            </el-row>
          </div>
        </template>
        <el-form-item label="仓位配置">
          <el-link type="primary" @click="togglePositionCollapse" style="margin-left: 8px;">
            {{ positionCollapse.includes('position') ? '收起仓位设置' : temp.position_config ? '展开仓位设置' : '仓位设置' }}
          </el-link>
        </el-form-item>

        <template v-if="positionCollapse.includes('position')">
          <div class="position-config-box" v-if="temp.position_config">
            <el-form-item label="单组资金">
              <el-input-number v-model="temp.position_config.principal" :min="0" />
            </el-form-item> 
            <el-form-item label="杠杆">
              <el-input-number v-model="temp.position_config.leverage" :min="1" />
            </el-form-item>
            <el-form-item label="限制下单类型">
              <el-select v-model.number="temp.position_config.order_type" style="width: 200px">
                <el-option label="市价单" :value="1" />
                <el-option label="限价单" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="指定执行器">
              <el-select v-model="temp.position_config.executor_id" style="width: 200px" clearable placeholder="不指定">
                <el-option v-for="item in enabledExecutors" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </div>
        </template>
        <el-form-item label="出入场配置">
          <el-link type="primary" @click="toggleEntryExitCollapse" style="margin-left: 8px;">
            {{ entryExitCollapse.includes('entry_exit') ? '收起出入场配置' : '展开出入场配置' }}
          </el-link>
        </el-form-item>
        <template v-if="entryExitCollapse.includes('entry_exit')">
          <el-form-item label="入场策略" prop="enter_strategy_class_name">
            <el-select
              v-model="temp.enter_strategy_class_name"
              @focus="collapsePositionConfig"
              filterable
              clearable
              @change="handleEnterStrategyTemplateChange"
            >
              <el-option
                v-for="item in enterStrategyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <span>{{ item.label }}</span>
                <el-tag
                  v-if="item.tag"
                  size="small"
                  type="info"
                  effect="plain"
                  style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                >
                  {{ item.tag }}
                </el-tag>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="入场参数" prop="enter_strategy_config">
            <div class="param-scroll-area">
              <DynamicForm
                v-if="selectedEnterStrategyTemplate && Array.isArray(selectedEnterStrategyTemplate.parameters) && selectedEnterStrategyTemplate.parameters.length > 0 && temp.enter_strategy_class_name"
                :fields="selectedEnterStrategyTemplate.parameters"
                v-model:modelValue="temp.enter_strategy_config"
                :key="enterStrategyParamFormKey"
              />
              <div v-else style="color: #b0b3b8;">无需参数</div>
            </div>
          </el-form-item>
          <el-form-item label="出场策略" prop="exit_strategy_class_name">
            <el-select
              v-model="temp.exit_strategy_class_name"
              @focus="collapsePositionConfig"
              filterable
              clearable
              @change="handleExitStrategyTemplateChange"
            >
              <el-option
                v-for="item in exitStrategyOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <span>{{ item.label }}</span>
                <el-tag
                  v-if="item.tag"
                  size="small"
                  type="info"
                  effect="plain"
                  style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;"
                >
                  {{ item.tag }}
                </el-tag>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="出场参数" prop="exit_strategy_config">
            <div class="param-scroll-area">
              <DynamicForm
                v-if="selectedExitStrategyTemplate && Array.isArray(selectedExitStrategyTemplate.parameters) && selectedExitStrategyTemplate.parameters.length > 0 && temp.exit_strategy_class_name"
                :fields="selectedExitStrategyTemplate.parameters"
                v-model:modelValue="temp.exit_strategy_config"
                :key="exitStrategyParamFormKey"
              />
              <div v-else style="color: #b0b3b8;">无需参数</div>
            </div>
          </el-form-item>
        </template>
        <el-form-item label="风控" prop="risk_policies">
          <el-row :gutter="24" style="width: 100%;">
            <!-- 策略列表 -->
            <el-col :span="7" style="min-width: 200px;">
              <div class="policy-list scrollable-policy-list">
                <template v-for="(tpl, idx) in riskPolicyTemplates" :key="tpl.name">
                  <div
                    @click="selectRiskPolicy(idx)"
                    :class="{active: idx === selectedRiskPolicyIdx}"
                    style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 8px;"
                  >
                    <el-tooltip v-if="tpl.desc" effect="light" placement="left" :hide-after="0">
                      <template #content>
                        <div v-html="formatDesc(tpl.desc)" style="white-space: pre-line; max-width: 400px;"></div>
                      </template>
                      <span>
                        {{ tpl.name }}
                        <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                          {{ formatTag(tpl.tag) }}
                        </el-tag>
                      </span>
                    </el-tooltip>
                    <span v-else>
                      {{ tpl.name }}
                      <el-tag v-if="tpl.tag" size="small" type="info" effect="plain" style="margin-left: 6px; font-size: 12px; color: #b0b3b8; border-color: #e0e0e0;">
                        {{ formatTag(tpl.tag) }}
                      </el-tag>
                    </span>
                    <el-switch
                      :model-value="isRiskPolicyEnabled(tpl.name)"
                      @update:model-value="val => setRiskPolicyEnabled(tpl.name, val)"
                      @click.stop
                    />
                  </div>
                </template>
                <div v-if="!riskPolicyTemplates.length" style="color: #b0b3b8; text-align: center; margin-top: 40px;">暂无策略</div>
              </div>
            </el-col>
            <!-- 竖线分隔符 -->
            <el-col :span="1" class="vertical-divider-col">
              <div class="vertical-divider"></div>
            </el-col>
            <!-- 策略参数表单 -->
            <el-col :span="15">
              <div
                v-if="currentRiskPolicyTemplate"
                :class="{ 'param-disabled': !isRiskPolicyEnabled(currentRiskPolicyTemplate.name) }"
                style="padding: 24px; background: #fff; border-radius: 8px; min-height: 180px;"
              >
                <DynamicForm
                  :fields="currentRiskPolicyTemplate.parameters || []"
                  v-model:modelValue="currentRiskPolicyParams"
                  :key="currentRiskPolicyTemplate.name"
                  :disabled="!isRiskPolicyEnabled(currentRiskPolicyTemplate.name)"
                />
              </div>
              <div v-else style="color: #b0b3b8; padding: 24px;">请选择左侧策略</div>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item v-if="dialogStatus === 'create'" label="是否启用" prop="is_enabled">
          <el-switch v-model="temp.is_enabled" />
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

    <!-- 策略数据查看组件 -->
    <StrategyDataViewer
      v-if="dataDialogVisible && currentStrategyData && currentStrategyData.id"
      :visible="dataDialogVisible"
      :strategy-id="currentStrategyData.id"
      @update:visible="dataDialogVisible = $event"
    />
  </div>
</template>

<script>
import { getStrategies, createStrategy, updateStrategy, deleteStrategy, runStrategy, updateStrategyState, restartStrategy as restartStrategyAPI,
  getEnterStrategies, 
  getExitStrategies,
  getStrategyTemplates,
  getEnterStrategyTemplates,
  getExitStrategyTemplates,
  getStrategyPolicyTemplates,
  getStrategyFabricatorTemplates } from '@/api/strategy'
import { getDataSources, getDataSourceTemplates, fetchDataSourceParameters } from '@/api/datasource'
import { getRiskPolicies } from '@/api/risk'
import Pagination from '@/components/Pagination/index.vue'
import StrategyDataViewer from '@/components/StrategyDataViewer.vue'
import { Plus, Edit, Delete, VideoPlay, RemoveFilled, RefreshLeft, DataAnalysis, RefreshRight } from '@element-plus/icons-vue'
import { formatDate,formatTag } from '@/utils/format'
import { getExecutors } from '@/api/executor'
import DynamicForm from '@/components/DynamicForm.vue'

export default {
  name: 'Strategy',
  components: { Pagination, DynamicForm, StrategyDataViewer },
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
        strategy_params: {},
        data_source_config: null,
        data_source_params: {},
        position_config: null,
        enter_strategy_class_name: '',
        enter_strategy_config: {},
        exit_strategy_class_name: '',
        exit_strategy_config: {},
        risk_policies: [],
        selectedDataSourceCls: [],
        info_fabricator_configs: [],
        is_enabled: false
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        selectedDataSourceCls: [
          { type: 'array', required: true, message: '请选择数据源', trigger: 'change' }
        ],
        position_config: [{ required: true, message: '请选择仓位配置', trigger: 'change' }],
        enter_strategy_class_name: [{ required: true, message: '请选择入场策略', trigger: 'change', type: 'string' }],
        exit_strategy_class_name: [{ required: true, message: '请选择出场策略', trigger: 'change', type: 'string' }]
      },
      dataSources: [],
      dataSourceTemplates: [],
      positionConfigs: [],
      currentDataSource: null,
      enterStrategies: [],
      exitStrategies: [],
      riskPolicies: [],
      positionCollapse: [],
      strategyOptions: [],
      enterStrategyOptions: [],
      exitStrategyOptions: [],
      enabledExecutors: [],
      selectedStrategyTemplate: null,
      strategyParamFormKey: 0,
      selectedEnterStrategyTemplate: null,
      enterStrategyParamFormKey: 0,
      selectedExitStrategyTemplate: null,
      exitStrategyParamFormKey: 0,
      rawEnterStrategyTemplates: [],
      rawExitStrategyTemplates: [],
      rawStrategyTemplates: [],
      riskPolicyTemplates: [],
      selectedRiskPolicyIdx: 0,
      currentDataSourceParameters: [],
      isEnabledFilter: true,
      infoFabricatorCollapse: [],
      infoFabricatorTemplates: [],
      selectedInfoFabricatorIdx: 0,
      entryExitCollapse: [],
      dataDialogVisible: false,
      currentStrategyData: null
    }
  },
  computed: {
    currentRiskPolicyTemplate() {
      return this.riskPolicyTemplates[this.selectedRiskPolicyIdx] || null
    },
    currentRiskPolicyParams: {
      get() {
        const tpl = this.currentRiskPolicyTemplate
        if (!tpl) return {}
        let found = this.riskPolicies.find(p => p.name === tpl.name)
        if (!found) {
          found = { name: tpl.name, enabled: false, params: {} }
          this.riskPolicies.push(found)
        }
        return found.params
      },
      set(val) {
        const tpl = this.currentRiskPolicyTemplate
        if (!tpl) return
        let found = this.riskPolicies.find(p => p.name === tpl.name)
        if (found) found.params = val
      }
    },
    currentDataSourceTemplate() {
      const ds = this.currentDataSource
      if (!ds) return null
      return this.dataSourceTemplates.find(tpl => tpl.class_name === ds.class_name) || null
    },
    currentStrategyDesc() {
      const selected = this.strategyOptions.find(
        item => item.value === this.temp.class_name
      )
      if (selected && selected.desc) {
        return selected.desc.replace(/\n/g, '<br/>').replace(/  /g, '&nbsp;&nbsp;')
      }
      return ''
    },
    isDataSourceParamDisabled() {
      return this.temp.selectedDataSourceCls.length === 0
    },
    currentInfoFabricatorTemplate() {
      return this.infoFabricatorTemplates[this.selectedInfoFabricatorIdx] || null
    },
    currentInfoFabricatorParams: {
      get() {
        const tpl = this.currentInfoFabricatorTemplate
        if (!tpl) return {}
        let found = (this.temp.info_fabricator_configs || []).find(p => p.class_name === tpl.cls)
        if (!found) {
          found = { class_name: tpl.cls, enabled: false, params: {} }
          this.temp.info_fabricator_configs.push(found)
        }
        return found.params
      },
      set(val) {
        const tpl = this.currentInfoFabricatorTemplate
        if (!tpl) return
        let found = (this.temp.info_fabricator_configs || []).find(p => p.class_name === tpl.cls)
        if (found) found.params = val
      }
    }
  },
  watch: {
  },
  created() {
    this.getList()
    this.fetchStrategies()
    this.fetchEnterStrategies()
    this.fetchExitStrategies()
    this.fetchEnabledExecutors()
    this.fetchRiskPolicyTemplates()
    this.getDataSources()
    this.getDataSourceTemplates()
    this.fetchInfoFabricatorTemplates()
    this.$nextTick(() => {
      if (this.dataSources && this.dataSources.length > 0) {
        this.temp.selectedDataSourceCls = this.dataSources.map(ds => ds.id)
        this.selectDataSource(0)
      }
    })
  },
  methods: {
    formatDate,
    formatTag,
    async restartStrategy(id) {
      try {
        await restartStrategy(id)
        this.$message.success('重启策略成功')
      } catch (error) {
        this.$message.error('重启策略失败')
      }
    },
    getStrategyName(className) {
      const tpl = this.rawStrategyTemplates?.find(item => item.cls === className)
      return tpl ? tpl.name : className
    },
    async getList() {
      this.listLoading = true
      try {
        const params = {
          ...this.listQuery,
          is_enabled: this.isEnabledFilter ? 1 : 0
        }
        const { data } = await getStrategies(params)
        this.list = data
        this.total = data.length
      } catch (error) {
        console.error('获取策略列表失败:', error)
        this.$message.error('获取策略列表失败')
      }
      this.listLoading = false
    },
    async getDataSources() {
      try {
        const { data } = await getDataSources({ enable: true, limit: 0 })
        this.dataSources = data
      } catch (error) {
        this.$message.error('获取数据源列表失败')
      }
    },
    async getEnterStrategies() {
      try {
        const { data } = await getEnterStrategies()
        this.enterStrategies = data
      } catch (error) {
        this.$message.error('获取入场策略列表失败')
      }
    },
    async getExitStrategies() {
      try {
        const { data } = await getExitStrategies()
        this.exitStrategies = data
      } catch (error) {
        this.$message.error('获取出场策略列表失败')
      }
    },
    async getRiskPolicies() {
      try {
        const { data } = await getRiskPolicies()
        this.riskPolicies = data
      } catch (error) {
        this.$message.error('获取风险控制策略列表失败')
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
        strategy_params: {},
        data_source_config: null,
        data_source_params: {},
        position_config: null,
        enter_strategy_class_name: '',
        enter_strategy_config: {},
        exit_strategy_class_name: '',
        exit_strategy_config: {},
        risk_policies: [],
        selectedDataSourceCls: [],
        info_fabricator_configs: [],
        is_enabled: false
      }
      this.currentDataSource = null
      this.currentDataSourceParameters = []
      this.positionCollapse = []
      this.infoFabricatorCollapse = []
    },
    handleCreate() {
      this.resetTemp()
      this.collapsePositionConfig()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.fetchStrategies()
      const defaultEnter = this.enterStrategyOptions.find(i => i.value === 'leek_core.sub_strategy.base|EnterStrategy')
      if (defaultEnter) {
        this.temp.enter_strategy_class_name = defaultEnter.value || ''
        this.handleEnterStrategyTemplateChange(defaultEnter.value)
      }
      const defaultExit = this.exitStrategyOptions.find(i => i.value === 'leek_core.sub_strategy.base|ExitStrategy')
      if (defaultExit) {
        this.temp.exit_strategy_class_name = defaultExit.value || ''
        this.handleExitStrategyTemplateChange(defaultExit.value)
      }
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    async createData() {
      this.$refs['dataForm'].validate(async (valid) => {
        if (valid) {
          try {
            const tempToSubmit = { ...this.temp }
            tempToSubmit.params = this.temp.strategy_params || {}
            if (!tempToSubmit.position_config || Object.keys(tempToSubmit.position_config).length === 0) {
              delete tempToSubmit.position_config
            }            // 添加策略参数
            tempToSubmit.sparams = this.temp.strategy_params || {}
            // 组装数据源参数
            tempToSubmit.data_source_config = (this.temp.selectedDataSourceCls || []).map(cls => {
              const ds = this.dataSources.find(d => d.id === cls)
              return {
                id: ds.id,
                class_name: ds.class_name,
                config: (this.temp.data_source_params && this.temp.data_source_params[ds.id]) || {}
              }
            })
            // 组装风控参数
            tempToSubmit.risk_policies = (this.riskPolicyTemplates || [])
              .filter((tpl, idx) => this.isRiskPolicyEnabled(tpl.name))
              .map(tpl => ({
                class_name: tpl.cls,
                config: (this.riskPolicies.find(p => p.name === tpl.name)?.params) || {}
              }))
            // 组装数据处理配置
            tempToSubmit.info_fabricator_configs = (this.infoFabricatorTemplates || [])
              .filter((tpl, idx) => this.isInfoFabricatorEnabled(tpl.cls))
              .map(tpl => ({
                class_name: tpl.cls,
                config: (this.temp.info_fabricator_configs || []).find(p => p.class_name === tpl.cls)?.params || {}
              }))
            tempToSubmit.data_source_params = undefined
            tempToSubmit.is_enabled = this.temp.is_enabled
            await createStrategy(tempToSubmit)
            this.isEnabledFilter = this.temp.is_enabled
            this.dialogFormVisible = false
            this.$message.success('创建成功')
            this.getList()
          } catch (error) {
            this.$message.error('创建失败')
          }
        }
      })
    },
    handleUpdate(row) {
      // 基础字段
      this.collapsePositionConfig()
      this.fetchStrategies()
      this.temp = {
        id: row.id,
        name: row.name || '',
        description: row.description || '',
        class_name: row.class_name || '',
        strategy_params: row.params || {},
        selectedDataSourceCls: row.data_source_config.map(ds => ds.id),
        position_config: row.position_config || null,
        enter_strategy_class_name: row.enter_strategy_class_name,
        enter_strategy_config: row.enter_strategy_config || {},
        exit_strategy_class_name: row.exit_strategy_class_name,
        exit_strategy_config: row.exit_strategy_config || {},
        risk_policies: [],
        info_fabricator_configs: Array.isArray(row.info_fabricator_configs)
          ? row.info_fabricator_configs.map(cfg => ({
              class_name: cfg.class_name,
              enabled: true,
              params: cfg.config || {}
            }))
          : [],
        is_enabled: row.is_enabled || false
      }
      // 设置策略模板以显示参数
      if (row.class_name) {
        this.handleStrategyTemplateChange(row.class_name)
      }
      // 数据源回显
      if (Array.isArray(row.data_source_config)) {
        this.temp.data_source_params = {}
        row.data_source_config.forEach(ds => {
          this.temp.data_source_params[ds.id] = ds.config || {}
        })
      }
      // 风控回显
      if (Array.isArray(row.risk_policies)) {
        this.riskPolicies = (this.riskPolicyTemplates || []).map(tpl => {
          const found = row.risk_policies.find(rp => rp.class_name === tpl.cls)
          return {
            name: tpl.name,
            enabled: !!found,
            params: found ? (found.config || {}) : {}
          }
        })
      }
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.fetchEnterStrategies()
        this.fetchExitStrategies()
        this.$refs['dataForm'].clearValidate()
      })
    },
    async updateData() {
      this.collapsePositionConfig()
      this.$refs['dataForm'].validate(async (valid) => {
        if (valid) {
          try {
            const tempToSubmit = { ...this.temp }
            tempToSubmit.params = this.temp.strategy_params || {}
            if (!tempToSubmit.position_config || Object.keys(tempToSubmit.position_config).length === 0) {
              delete tempToSubmit.position_config
            }
            // 添加策略参数
            tempToSubmit.strategy_params = this.temp.strategy_params || {}
            // 组装数据源参数
            tempToSubmit.data_source_config = (this.temp.selectedDataSourceCls || []).map(cls => {
              const ds = this.dataSources.find(d => d.id === cls)
              return {
                id: ds.id,
                class_name: ds.class_name,
                config: (this.temp.data_source_params && this.temp.data_source_params[ds.id]) || {}
              }
            })
            // 组装风控参数
            tempToSubmit.risk_policies = (this.riskPolicyTemplates || [])
              .filter((tpl, idx) => this.isRiskPolicyEnabled(tpl.name))
              .map(tpl => ({
                class_name: tpl.cls,
                config: (this.riskPolicies.find(p => p.name === tpl.name)?.params) || {}
              }))
            // 组装数据处理配置
            tempToSubmit.info_fabricator_configs = (this.infoFabricatorTemplates || [])
              .filter((tpl, idx) => this.isInfoFabricatorEnabled(tpl.cls))
              .map(tpl => ({
                class_name: tpl.cls,
                config: (this.temp.info_fabricator_configs || []).find(p => p.class_name === tpl.cls)?.params || {}
              }))
            tempToSubmit.data_source_params = undefined
            tempToSubmit.is_enabled = this.temp.is_enabled
            await updateStrategy(this.temp.id, tempToSubmit)
            this.dialogFormVisible = false
            this.$message.success('更新成功')
            this.getList()
          } catch (error) {
            this.$message.error('更新失败')
          }
        }
      })
    },
    async handleDelete(row) {
      try {
        await this.$confirm('确认删除该策略?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteStrategy(row.id)
        this.$message.success('删除成功')
        this.getList()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败')
        }
      }
    },
    async handleRun(row) {
      try {
        await this.$confirm('确认运行该策略?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await runStrategy(row.id)
        this.$message.success('策略已启动')
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('启动失败')
        }
      }
    },
    async fetchStrategies() {
      const res = await getStrategyTemplates()
      this.rawStrategyTemplates = res.data
      this.strategyOptions = res.data.map(i => ({
        label: i.name,
        value: i.cls,
        tag: i.tag,
        desc: i.desc
      }))
    },
    async fetchEnterStrategies() {
      const res = await getEnterStrategyTemplates()
      this.rawEnterStrategyTemplates = res.data
      this.enterStrategyOptions = res.data.map(i => ({ label: i.name, value: i.cls, tag: i.tag }))
      const defaultEnter = this.enterStrategyOptions.find(i => i.value === 'leek_core.sub_strategy.base|EnterStrategy')
      if (defaultEnter && !this.temp.enter_strategy_class_name) {
        this.temp.enter_strategy_class_name = defaultEnter.value
        this.handleEnterStrategyTemplateChange(defaultEnter.value)
      }
    },
    async fetchExitStrategies() {
      const res = await getExitStrategyTemplates()
      this.rawExitStrategyTemplates = res.data
      this.exitStrategyOptions = res.data.map(i => ({ label: i.name, value: i.cls, tag: i.tag }))
      const defaultExit = this.exitStrategyOptions.find(i => i.value === 'leek_core.sub_strategy.base|ExitStrategy')
      if (defaultExit && !this.temp.exit_strategy_class_name) {
        this.temp.exit_strategy_class_name = defaultExit.value
        this.handleExitStrategyTemplateChange(defaultExit.value)
      }
    },
    async fetchEnabledExecutors() {
      try {
        const { data } = await getExecutors({ enable: true, limit: 0 })
        this.enabledExecutors = data.map(item => ({ id: item.id, name: item.name }))
      } catch (error) {
        this.$message.error('获取执行器列表失败')
      }
    },
    togglePositionCollapse() {
      if (this.positionCollapse.includes('position')) {
        this.positionCollapse = []
      } else {
        this.positionCollapse = ['position']
        if (!this.temp.position_config) {
          this.temp.position_config = {
            principal: 20,
            leverage: 1,
            order_type: 1,
            executor_id: null
          }
        }
      }
    },
    toggleInfoFabricatorCollapse() {
      if (this.infoFabricatorCollapse.includes('info_fabricator')) {
        this.infoFabricatorCollapse = []
      } else {
        this.infoFabricatorCollapse = ['info_fabricator']
        if (!Array.isArray(this.temp.info_fabricator_configs)) {
          this.temp.info_fabricator_configs = []
        }
      }
    },
    collapsePositionConfig() {
      this.positionCollapse = []
    },
    handleStrategyTemplateChange(value) {
      this.selectedStrategyTemplate = this.rawStrategyTemplates.find(tpl => tpl.cls === value)
      this.strategyParamFormKey++
    },
    handleEnterStrategyTemplateChange(value) {
      if (typeof value !== 'string') {
        value = ''
      }
      this.selectedEnterStrategyTemplate = this.rawEnterStrategyTemplates.find(tpl => tpl.cls === value)
      this.enterStrategyParamFormKey++
    },
    handleExitStrategyTemplateChange(value) {
      if (typeof value !== 'string') {
        value = ''
      }
      this.selectedExitStrategyTemplate = this.rawExitStrategyTemplates.find(tpl => tpl.cls === value)
      this.exitStrategyParamFormKey++
    },
    async fetchRiskPolicyTemplates() {
      const { data } = await getStrategyPolicyTemplates()
      this.riskPolicyTemplates = data
    },
    selectRiskPolicy(idx) {
      this.selectedRiskPolicyIdx = idx
    },
    isRiskPolicyEnabled(name) {
      const found = this.riskPolicies.find(p => p.name === name)
      return found ? found.enabled : false
    },
    setRiskPolicyEnabled(name, val) {
      let found = this.riskPolicies.find(p => p.name === name)
      if (found) {
        found.enabled = val
      } else {
        this.riskPolicies.push({ name, enabled: val, params: {} })
      }
    },
    selectDataSource(idx) {
      const ds = this.dataSources[idx]
      if (ds == this.currentDataSource) {
        return
      }
      this.currentDataSource = ds
      if (ds) {
        this.temp.data_source_config = {
          id: ds.id,
          name: ds.name,
          params: this.temp.data_source_params && this.temp.data_source_params[ds.id]
            ? this.temp.data_source_params[ds.id]
            : {}
        }
        this.fetchDataSourceParameters(ds)
      }
    },
    async getDataSourceTemplates() {
      try {
        const { data } = await getDataSourceTemplates()
        this.dataSourceTemplates = data
      } catch (error) {
        this.$message.error('获取数据源模板失败')
      }
    },
    async fetchDataSourceParameters(ds) {
      if (!ds) {
        this.currentDataSourceParameters = []
        return
      }
      try {
        const { data } = await fetchDataSourceParameters({
          class_name: ds.class_name,
          params: ds.params || {}
        })
        this.currentDataSourceParameters = data
      } catch (error) {
        this.currentDataSourceParameters = []
      }
    },
    formatDesc(desc) {
      if (!desc) return ''
      return desc.replace(/\n/g, '<br/>').replace(/  /g, '&nbsp;&nbsp;')
    },
    async handleDisable(row) {
      await updateStrategy(row.id, { is_enabled: false })
      this.getList()
    },
    async handleEnable(row) {
      await updateStrategy(row.id, { is_enabled: true })
      this.getList()
    },
    getDataSourceName(dsCfg) {
      const found = this.dataSources.find(d => d.id === dsCfg.id)
      return found ? found.name : (dsCfg.class_name || '未知数据源')
    },
    async fetchInfoFabricatorTemplates() {
      try {
        const { data } = await getStrategyFabricatorTemplates()
        this.infoFabricatorTemplates = data
      } catch (error) {
        this.$message.error('获取数据处理模板失败')
      }
    },
    selectInfoFabricator(idx) {
      this.selectedInfoFabricatorIdx = idx
    },
    getInfoFabricatorName(cfg) {
      const found = this.infoFabricatorTemplates.find(p => p.name === cfg.name)
      return found ? found.name : (cfg.class_name || '未知处理器')
    },
    toggleEntryExitCollapse() {
      if (this.entryExitCollapse.includes('entry_exit')) {
        this.entryExitCollapse = []
      } else {
        this.entryExitCollapse = ['entry_exit']
      }
    },
    isInfoFabricatorEnabled(cls) {
      const found = (this.temp.info_fabricator_configs || []).find(p => p.class_name === cls)
      return found ? found.enabled : false
    },
    setInfoFabricatorEnabled(cls, val) {
      let found = (this.temp.info_fabricator_configs || []).find(p => p.class_name === cls)
      if (found) {
        found.enabled = val
      } else {
        this.temp.info_fabricator_configs.push({ class_name: cls, enabled: val, params: {} })
      }
    },
    async handleViewData(row) {
      this.currentStrategyData = row
      this.dataDialogVisible = true
    }
  }
}
</script>

<style lang="scss" scoped>
.strategy-page {
  padding: 20px;
  
  .header-bar {
    .table-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
  
  .text-center {
    text-align: center;
  }
  
  .text-end {
    text-align: end;
  }
  
  .py-4 {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}

.position-config-box {
  margin-left: 32px;
  padding: 16px 24px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafbfc;
  margin-bottom: 16px;
}

.param-scroll-area {
  max-height: 400px;
  overflow-y: auto;
}

.vertical-divider {
  width: 1px;
  height: 100%;
  background: #ebeef5;
  margin: 0 8px;
}
.policy-list .active {
  background: #f5f7fa;
  border-radius: 4px;
}
.param-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.scrollable-policy-list {
  max-height: 300px;
  overflow-y: auto;
}

.data-source-list .active {
  background: #f5f7fa;
  border-radius: 4px;
}

.data-source-checkbox-group {
  max-height: 300px;
  overflow-y: auto;
  display: block;
}
</style> 