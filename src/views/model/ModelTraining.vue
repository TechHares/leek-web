<template>
  <div class="model-training-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <div class="table-actions">
            <div class="left-actions">
              <el-input
                v-model="filters.name"
                placeholder="搜索训练名称"
                clearable
                style="width: 200px;"
                class="filter-item"
                @keyup.enter="loadData"
              />
              <el-select
                v-model="filters.status"
                placeholder="状态"
                clearable
                style="width: 150px;"
                class="filter-item"
                @change="loadData"
              >
                <el-option label="全部" value="" />
                <el-option label="排队中" value="pending" />
                <el-option label="运行中" value="running" />
                <el-option label="已完成" value="completed" />
                <el-option label="失败" value="failed" />
              </el-select>
              <el-button @click="loadData" :loading="loading">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
            </div>
            <div class="right-actions">
              <el-button type="primary" @click="showCreateDialog">
                <el-icon><Plus /></el-icon> 新建训练
              </el-button>
            </div>
          </div>
        </div>
      </template>
      <div v-if="loading" class="text-center py-4">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else>
        <el-table
          :data="list"
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
          <el-table-column label="名称" min-width="200">
            <template #default="scope">
              {{ scope.row.name }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">{{ getStatusLabel(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="评分" width="120">
            <template #default="scope">
              <span v-if="scope.row.score !== null && scope.row.score !== undefined">
                {{ formatScore(scope.row.score, scope.row.task_type) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="200">
            <template #default="scope">
              <el-button size="small" @click="viewDetails(scope.row)">查看</el-button>
              <el-button size="small" @click="handleCopy(scope.row)">
                <el-icon><CopyDocument /></el-icon>
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
        v-model:page="pagination.page"
        v-model:limit="pagination.size"
        @pagination="loadData"
      />
    </el-card>

    <el-dialog title="新建模型训练" v-model="createDialogVisible" width="800px">
      <el-form
        ref="formRef"
        :rules="rules"
        :model="form"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="数据配置" prop="data_config_id">
          <el-select v-model="form.data_config_id" placeholder="请选择数据配置" style="width: 100%;" @change="onDataConfigChange">
            <el-option v-for="cfg in dataConfigs" :key="cfg.id" :label="cfg.name" :value="cfg.id" />
          </el-select>
          <div class="form-tip">配置请在 策略回测 -> 数据配置 中创建</div>
        </el-form-item>
        <el-form-item label="交易标的" prop="symbols">
          <el-select v-model="form.symbols" multiple filterable allow-create default-first-item placeholder="输入后回车添加" style="width: 100%;">
            <el-option v-for="s in form.symbols" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间周期" prop="timeframes">
          <el-select v-model="form.timeframes" multiple placeholder="请选择时间周期" style="width: 100%;">
            <el-option v-for="tf in timeframeOptions" :key="tf.value" :label="tf.label" :value="tf.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围" prop="date_range">
          <el-date-picker v-model="form.date_range" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" :shortcuts="dateRangeShortcuts" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="因子" prop="factor_ids">
          <el-select v-model="form.factor_ids" multiple filterable placeholder="请选择因子" style="width: 100%;">
            <el-option v-for="factor in factors" :key="factor.id" :label="factor.name" :value="factor.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签生成器" prop="label_generator_id">
          <el-select v-model="form.label_generator_id" placeholder="请选择标签生成器" style="width: 100%;">
            <el-option v-for="gen in labelGenerators" :key="gen.id" :label="gen.name" :value="gen.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="训练器" prop="trainer_id">
          <el-select v-model="form.trainer_id" placeholder="请选择训练器" style="width: 100%;">
            <el-option v-for="trainer in trainers" :key="trainer.id" :label="trainer.name" :value="trainer.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="训练/验证数据划分" prop="train_split_ratio">
          <el-slider v-model="trainSplitPercent" :min="1" :max="99" show-input :format-tooltip="formatSplitTooltip" />
          <div class="form-tip">训练数据: {{ trainSplitPercent }}% | 验证数据: {{ 100 - trainSplitPercent }}%</div>
        </el-form-item>
        <el-form-item label="继续训练">
          <el-switch v-model="form.continue_training" @change="onContinueTrainingChange" />
          <div class="form-tip">启用后将在已有模型基础上继续训练</div>
        </el-form-item>
        <el-form-item 
          v-if="form.continue_training" 
          label="基础模型" 
          prop="base_model_id"
        >
          <el-select 
            v-model="form.base_model_id" 
            placeholder="请选择基础模型" 
            filterable
            style="width: 100%;"
            :loading="loadingModels"
          >
            <el-option 
              v-for="model in models" 
              :key="model.id" 
              :label="`${model.name} (${model.version})`" 
              :value="model.id" 
            />
          </el-select>
          <div class="form-tip">选择要基于其继续训练的已有模型</div>
        </el-form-item>
        <el-form-item label="启用编码">
          <el-switch v-model="form.enable_symbol_timeframe_encoding" />
          <div class="form-tip">是否启用 symbol 和 timeframe 编码，透传到 FeatureEngine</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="text-end">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="createTask" :loading="creating">创建</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="训练详情" v-model="detailsDialogVisible" width="1200px" v-if="selectedTask" @close="handleDialogClose">
      <!-- 运行中/排队中显示步骤式进度 -->
      <div v-if="selectedTask.status === 'running' || selectedTask.status === 'pending'" style="margin-bottom: 20px;">
        <el-card shadow="never">
          <!-- 加载数据阶段 -->
          <div class="phase-row">
            <div :class="['phase-label', getPhaseStepClass(taskStatus?.phases?.loading_data?.status)]">
              加载数据
            </div>
            <div v-if="taskStatus?.phases?.loading_data?.symbols" class="phase-tasks">
              <div 
                v-for="(symbolTask, taskKey) in taskStatus.phases.loading_data.symbols" 
                :key="taskKey"
                :class="['task-step', getTaskStepClass(symbolTask.status)]"
                :title="`${symbolTask.symbol} ${symbolTask.timeframe}`"
              >
                {{ symbolTask.symbol }} {{ symbolTask.timeframe }}
              </div>
            </div>
          </div>
          
          <!-- 计算特征阶段 -->
          <div class="phase-row">
            <div :class="['phase-label', getPhaseStepClass(taskStatus?.phases?.computing_features?.status)]">
              计算特征
            </div>
            <div v-if="taskStatus?.phases?.computing_features?.symbols" class="phase-tasks">
              <div 
                v-for="(symbolTask, taskKey) in taskStatus.phases.computing_features.symbols" 
                :key="taskKey"
                :class="['task-step', getTaskStepClass(symbolTask.status)]"
                :title="`${symbolTask.symbol} ${symbolTask.timeframe}`"
              >
                {{ symbolTask.symbol }} {{ symbolTask.timeframe }}
              </div>
            </div>
          </div>
          
          <!-- 生成标签阶段 -->
          <div class="phase-row">
            <div :class="['phase-label', getPhaseStepClass(taskStatus?.phases?.generating_labels?.status)]">
              生成标签
            </div>
            <div v-if="taskStatus?.phases?.generating_labels?.symbols" class="phase-tasks">
              <div 
                v-for="(symbolTask, taskKey) in taskStatus.phases.generating_labels.symbols" 
                :key="taskKey"
                :class="['task-step', getTaskStepClass(symbolTask.status)]"
                :title="`${symbolTask.symbol} ${symbolTask.timeframe}`"
              >
                {{ symbolTask.symbol }} {{ symbolTask.timeframe }}
              </div>
            </div>
          </div>
          
          <!-- 切分数据阶段 -->
          <div class="phase-row">
            <div :class="['phase-label', getPhaseStepClass(taskStatus?.phases?.splitting_data?.status)]">
              切分数据
            </div>
            <div v-if="taskStatus?.phases?.splitting_data?.symbols" class="phase-tasks">
              <div 
                v-for="(symbolTask, taskKey) in taskStatus.phases.splitting_data.symbols" 
                :key="taskKey"
                :class="['task-step', getTaskStepClass(symbolTask.status)]"
                :title="`${symbolTask.symbol} ${symbolTask.timeframe}`"
              >
                {{ symbolTask.symbol }} {{ symbolTask.timeframe }}
              </div>
            </div>
          </div>
          
          <!-- 合并数据阶段 -->
          <div class="phase-row phase-row-full">
            <div :class="['phase-label-full', getPhaseStepClass(taskStatus?.phases?.merging_data?.status)]">
              合并数据
            </div>
          </div>

          <!-- 加载旧模型 -->
          <div class="phase-row phase-row-full">
            <div :class="['phase-label-full', getPhaseStepClass(taskStatus?.phases?.loading_old_model?.status)]">
              加载旧模型
            </div>
          </div>
          
          <!-- 评估旧模型 -->
          <div class="phase-row phase-row-full">
            <div :class="['phase-label-full', getPhaseStepClass(taskStatus?.phases?.evaluating_old_model?.status)]">
              评估旧模型
            </div>
          </div>
          
          <!-- 训练模型 -->
          <div class="phase-row phase-row-full">
            <div class="phase-training-container">
              <div 
                class="phase-training-progress-wrapper"
                :class="getPhaseStepClass(taskStatus?.phases?.training?.status)"
              >
                <div 
                  class="phase-training-progress-bar"
                  :style="{ width: getTrainingProgress() + '%' }"
                >
                </div>
                <span class="phase-training-progress-text">
                  训练模型
                </span>
              </div>
            </div>
          </div>
          
          <!-- 评估模型 -->
          <div class="phase-row phase-row-full">
            <div :class="['phase-label-full', getPhaseStepClass(taskStatus?.phases?.evaluating?.status)]">
              评估模型
            </div>
          </div>
          
          <!-- 保存模型 -->
          <div class="phase-row phase-row-full">
            <div :class="['phase-label-full', getPhaseStepClass(taskStatus?.phases?.saving_model?.status)]">
              保存模型
            </div>
          </div>
          
          <!-- 总体进度 -->
          <div style="margin-top: 20px;">
            <el-progress
              :percentage="Math.round((selectedTask.progress || 0) * 100)"
              :status="selectedTask.status === 'failed' ? 'exception' : undefined"
              :stroke-width="20"
            />
            <div style="text-align: center; margin-top: 10px; color: #909399;">
              {{ selectedTask.status === 'running' ? '训练任务运行中，请稍候...' : '训练任务排队中，请稍候...' }}
            </div>
          </div>
        </el-card>
      </div>

      <!-- 失败状态显示错误信息 -->
      <div v-if="selectedTask.status === 'failed'" style="margin-bottom: 20px;">
        <el-alert
          type="error"
          :title="selectedTask.error || '训练任务失败'"
          show-icon
        />
      </div>

      <!-- 已完成状态显示结果 -->
      <div v-if="selectedTask.status === 'completed'">
        <h3>训练指标</h3>
        
        <!-- 判断任务类型：分类还是回归 -->
        <template v-if="isClassificationTask(selectedTask.metrics)">
          <!-- 分类任务指标 -->
          <!-- 新旧模型指标对比 -->
          <div v-if="selectedTask.metrics?.old_model" style="margin-bottom: 20px;">
            <h4>模型对比</h4>
            <el-table :data="[selectedTask.metrics.old_model, selectedTask.metrics.new_model]" border>
              <el-table-column label="模型" width="120">
                <template #default="scope">
                  {{ scope.$index === 0 ? '旧模型' : '新模型' }}
                </template>
              </el-table-column>
              <el-table-column label="验证集准确率" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.accuracy) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集精确率" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.precision) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集召回率" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.recall) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集F1分数" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.f1) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集AUC" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.auc) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 新模型分类指标 -->
          <el-descriptions :column="2" border>
            <el-descriptions-item>
              <template #label>
                <span>训练集准确率
                  <el-tooltip content="准确率（Accuracy）：正确预测的样本数占总样本数的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.accuracy || selectedTask.metrics?.train?.accuracy) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集准确率
                  <el-tooltip content="准确率（Accuracy）：正确预测的样本数占总样本数的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.accuracy || selectedTask.metrics?.validation?.accuracy) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集精确率
                  <el-tooltip content="精确率（Precision）：预测为正类的样本中，实际为正类的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.precision || selectedTask.metrics?.train?.precision) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集精确率
                  <el-tooltip content="精确率（Precision）：预测为正类的样本中，实际为正类的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.precision || selectedTask.metrics?.validation?.precision) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集召回率
                  <el-tooltip content="召回率（Recall）：实际为正类的样本中，被正确预测为正类的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.recall || selectedTask.metrics?.train?.recall) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集召回率
                  <el-tooltip content="召回率（Recall）：实际为正类的样本中，被正确预测为正类的比例。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.recall || selectedTask.metrics?.validation?.recall) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集F1分数
                  <el-tooltip content="F1分数（F1-Score）：精确率和召回率的调和平均数，综合衡量模型性能。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.f1 || selectedTask.metrics?.train?.f1) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集F1分数
                  <el-tooltip content="F1分数（F1-Score）：精确率和召回率的调和平均数，综合衡量模型性能。范围0-1，越接近1越好。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.f1 || selectedTask.metrics?.validation?.f1) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedTask.metrics?.new_model?.train?.auc !== undefined || selectedTask.metrics?.train?.auc !== undefined">
              <template #label>
                <span>训练集AUC
                  <el-tooltip content="AUC-ROC：ROC曲线下的面积，衡量分类器区分正负样本的能力。范围0-1，越接近1越好，0.5表示随机猜测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.auc || selectedTask.metrics?.train?.auc) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedTask.metrics?.new_model?.validation?.auc !== undefined || selectedTask.metrics?.validation?.auc !== undefined">
              <template #label>
                <span>验证集AUC
                  <el-tooltip content="AUC-ROC：ROC曲线下的面积，衡量分类器区分正负样本的能力。范围0-1，越接近1越好，0.5表示随机猜测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.auc || selectedTask.metrics?.validation?.auc) }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        
        <!-- 回归任务指标 -->
        <template v-else>
          <!-- 新旧模型指标对比 -->
          <div v-if="selectedTask.metrics?.old_model" style="margin-bottom: 20px;">
            <h4>模型对比</h4>
            <el-table :data="[selectedTask.metrics.old_model, selectedTask.metrics.new_model]" border>
              <el-table-column label="模型" width="120">
                <template #default="scope">
                  {{ scope.$index === 0 ? '旧模型' : '新模型' }}
                </template>
              </el-table-column>
              <el-table-column label="验证集MSE" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.mse) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集RMSE" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.rmse) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集MAE" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.mae) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集R²" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.r2) }}
                </template>
              </el-table-column>
              <el-table-column label="验证集MAPE" width="150">
                <template #default="scope">
                  {{ formatMetric(scope.row?.validation?.mape) }}%
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 新模型回归指标 -->
          <el-descriptions :column="2" border>
            <el-descriptions-item>
              <template #label>
                <span>训练集MSE
                  <el-tooltip content="均方误差（Mean Squared Error）：预测值与真实值差的平方的平均值。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.mse || selectedTask.metrics?.train?.mse) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集MSE
                  <el-tooltip content="均方误差（Mean Squared Error）：预测值与真实值差的平方的平均值。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.mse || selectedTask.metrics?.validation?.mse) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集RMSE
                  <el-tooltip content="均方根误差（Root Mean Squared Error）：MSE的平方根，与目标值单位相同。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.rmse || selectedTask.metrics?.train?.rmse) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集RMSE
                  <el-tooltip content="均方根误差（Root Mean Squared Error）：MSE的平方根，与目标值单位相同。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.rmse || selectedTask.metrics?.validation?.rmse) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集MAE
                  <el-tooltip content="平均绝对误差（Mean Absolute Error）：预测值与真实值差的绝对值的平均值。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.mae || selectedTask.metrics?.train?.mae) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集MAE
                  <el-tooltip content="平均绝对误差（Mean Absolute Error）：预测值与真实值差的绝对值的平均值。越小越好，0为完美预测。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.mae || selectedTask.metrics?.validation?.mae) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>训练集R²
                  <el-tooltip content="决定系数（R-squared）：衡量模型对数据方差的解释程度。范围通常为0-1，越接近1越好；负数表示模型比简单平均值还差。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.r2 || selectedTask.metrics?.train?.r2) }}
            </el-descriptions-item>
            <el-descriptions-item>
              <template #label>
                <span>验证集R²
                  <el-tooltip content="决定系数（R-squared）：衡量模型对数据方差的解释程度。范围通常为0-1，越接近1越好；负数表示模型比简单平均值还差。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.r2 || selectedTask.metrics?.validation?.r2) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedTask.metrics?.new_model?.train?.mape !== undefined || selectedTask.metrics?.train?.mape !== undefined">
              <template #label>
                <span>训练集MAPE
                  <el-tooltip content="平均绝对百分比误差（Mean Absolute Percentage Error）：预测误差相对于真实值的百分比。越小越好，但接近0的值会导致MAPE异常大。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.train?.mape || selectedTask.metrics?.train?.mape) }}%
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedTask.metrics?.new_model?.validation?.mape !== undefined || selectedTask.metrics?.validation?.mape !== undefined">
              <template #label>
                <span>验证集MAPE
                  <el-tooltip content="平均绝对百分比误差（Mean Absolute Percentage Error）：预测误差相对于真实值的百分比。越小越好，但接近0的值会导致MAPE异常大。" placement="top">
                    <el-icon style="margin-left: 4px; cursor: help;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              {{ formatMetric(selectedTask.metrics?.new_model?.validation?.mape || selectedTask.metrics?.validation?.mape) }}%
            </el-descriptions-item>
          </el-descriptions>
        </template>
        
        <!-- 图表展示区域 -->
        <div v-if="selectedTask.status === 'completed'" style="margin-top: 30px;">
          <h3>可视化分析</h3>
          
          <!-- 回归任务图表 -->
          <template v-if="!isClassificationTask(selectedTask.metrics)">
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card shadow="never">
                  <template #header>
                    <span>预测值 vs 真实值（散点图）</span>
                  </template>
                  <div ref="regressionScatterChart" style="width: 100%; height: 400px;"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card shadow="never">
                  <template #header>
                    <span>残差分布</span>
                  </template>
                  <div ref="residualHistogramChart" style="width: 100%; height: 400px;"></div>
                </el-card>
              </el-col>
            </el-row>
          </template>
          
          <!-- 分类任务图表 -->
          <template v-if="isClassificationTask(selectedTask.metrics)">
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card shadow="never">
                  <template #header>
                    <span>预测概率分布</span>
                  </template>
                  <div ref="probaHistogramChart" style="width: 100%; height: 400px;"></div>
                </el-card>
              </el-col>
            </el-row>
          </template>
        </div>
        
        <div v-if="selectedTask.model_id" style="margin-top: 20px;">
          <el-button type="primary" @click="$router.push(`/model/models`)">查看模型</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { createModelTraining, getModelTrainingTasks, getModelTrainingTask, deleteModelTrainingTask } from '@/api/model_training'
import { getFactors } from '@/api/factor'
import { getLabelGenerators } from '@/api/label_generator'
import { getTrainers } from '@/api/trainer'
import { getModels } from '@/api/model'
import { listBacktestConfigs } from '@/api/backtest'
import { Plus, Search, Delete, CopyDocument, QuestionFilled, Refresh } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination/index.vue'
import { formatDate } from '@/utils/format'
import * as echarts from 'echarts'

export default {
  name: 'ModelTraining',
  components: { Pagination },
  data() {
    return {
      loading: false,
      creating: false,
      list: [],
      total: 0,
      pagination: { page: 1, size: 20 },
      filters: { name: '', status: '' },
      createDialogVisible: false,
      detailsDialogVisible: false,
      selectedTask: null,
      taskStatus: null,
      detailPollTimer: null,
      // 图表实例
      regressionScatterChart: null,
      residualHistogramChart: null,
      probaHistogramChart: null,
      dataConfigs: [],
      factors: [],
      labelGenerators: [],
      trainers: [],
      models: [],
      loadingModels: false,
      form: {
        name: '',
        description: '',
        data_config_id: undefined,
        symbols: [],
        timeframes: [],
        date_range: null,
        factor_ids: [],
        label_generator_id: undefined,
        trainer_id: undefined,
        train_split_ratio: 0.8,
        continue_training: false,
        base_model_id: undefined,
        enable_symbol_timeframe_encoding: true
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        data_config_id: [{ required: true, message: '请选择数据配置', trigger: 'change' }],
        symbols: [{ type: 'array', required: true, message: '请填写交易标的', trigger: 'change' }],
        timeframes: [{ type: 'array', required: true, message: '请选择时间周期', trigger: 'change' }],
        date_range: [{ type: 'array', required: true, message: '请选择时间范围', trigger: 'change' }],
        factor_ids: [{ type: 'array', required: true, message: '请选择因子', trigger: 'change' }],
        label_generator_id: [{ required: true, message: '请选择标签生成器', trigger: 'change' }],
        trainer_id: [{ required: true, message: '请选择训练器', trigger: 'change' }],
        base_model_id: [
          {
            validator: (rule, value, callback) => {
              if (this.form.continue_training && !value) {
                callback(new Error('启用继续训练时，请选择基础模型'))
              } else {
                callback()
              }
            },
            trigger: 'change'
          }
        ]
      },
      timeframeOptions: [
        { value: '1m', label: '1分钟' },
        { value: '3m', label: '3分钟' },
        { value: '5m', label: '5分钟' },
        { value: '15m', label: '15分钟' },
        { value: '30m', label: '30分钟' },
        { value: '1H', label: '1小时' },
        { value: '4H', label: '4小时' },
        { value: '12H', label: '12小时' },
        { value: '1D', label: '1天' }
      ],
      dateRangeShortcuts: [
        {
          text: '最近3天',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 3)
            return [start, end]
          }
        },
        {
          text: '最近一周',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
            return [start, end]
          }
        },
        {
          text: '最近一月',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
            return [start, end]
          }
        },
        {
          text: '最近三月',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
            return [start, end]
          }
        },
        {
          text: '最近半年',
          value: () => {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 180)
            return [start, end]
          }
        }
      ]
    }
  },
  computed: {
    trainSplitPercent: {
      get() {
        return Math.round(this.form.train_split_ratio * 100)
      },
      set(val) {
        this.form.train_split_ratio = val / 100
      }
    }
  },
  created() {
    this.loadData()
    this.loadFactors()
    this.loadLabelGenerators()
    this.loadTrainers()
    this.loadDataConfigs()
  },
  methods: {
    formatDate,
    formatSplitTooltip(val) {
      return `训练: ${val}% | 验证: ${100 - val}%`
    },
    getStatusType(status) {
      const map = { pending: 'info', running: 'warning', completed: 'success', failed: 'danger' }
      return map[status] || 'info'
    },
    getStatusLabel(status) {
      const map = { pending: '排队中', running: '运行中', completed: '已完成', failed: '失败' }
      return map[status] || status
    },
    async loadData() {
      this.loading = true
      try {
        const { data } = await getModelTrainingTasks({
          ...this.pagination,
          ...this.filters
        })
        this.list = data.items
        this.total = data.total
      } catch (error) {
        this.$message.error('加载失败')
      }
      this.loading = false
    },
    async loadFactors() {
      const { data } = await getFactors({ size: 1000 })
      this.factors = data
    },
    async loadLabelGenerators() {
      const { data } = await getLabelGenerators({ size: 1000 })
      this.labelGenerators = data
    },
    async loadTrainers() {
      const { data } = await getTrainers({ size: 1000 })
      this.trainers = data
    },
    async loadDataConfigs() {
      const { data } = await listBacktestConfigs({ size: 1000, type: 'data' })
      this.dataConfigs = data.items || data
    },
    async loadModels() {
      this.loadingModels = true
      try {
        const { data } = await getModels({ size: 1000 })
        this.models = data.items || data
      } catch (error) {
        this.$message.error('加载模型列表失败')
      }
      this.loadingModels = false
    },
    onContinueTrainingChange(value) {
      if (!value) {
        // 关闭继续训练时，清空基础模型选择
        this.form.base_model_id = undefined
        // 清除验证错误
        this.$nextTick(() => {
          if (this.$refs.formRef) {
            this.$refs.formRef.clearValidate('base_model_id')
          }
        })
      } else {
        // 启用继续训练时，加载模型列表
        if (this.models.length === 0) {
          this.loadModels()
        }
      }
    },
    onDataConfigChange(configId) {
      const config = this.dataConfigs.find(c => c.id === configId)
      if (config && config.extra) {
        const extra = typeof config.extra === 'string' ? JSON.parse(config.extra) : config.extra
        if (extra.symbols && extra.symbols.length > 0 && this.form.symbols.length === 0) {
          this.form.symbols = [...extra.symbols]
        }
        if (extra.timeframes && extra.timeframes.length > 0 && this.form.timeframes.length === 0) {
          this.form.timeframes = [...extra.timeframes]
        }
      }
    },
    async showCreateDialog() {
      await Promise.all([
        this.loadFactors(),
        this.loadLabelGenerators(),
        this.loadTrainers(),
        this.loadDataConfigs(),
        this.loadModels()
      ])
      this.form = {
        name: '',
        description: '',
        data_config_id: undefined,
        symbols: [],
        timeframes: [],
        date_range: null,
        factor_ids: [],
        label_generator_id: undefined,
        trainer_id: undefined,
        train_split_ratio: 0.8,
        continue_training: false,
        base_model_id: undefined
      }
      this.createDialogVisible = true
    },
    async createTask() {
      this.$refs.formRef.validate(async (valid) => {
        if (!valid) return
        if (!this.form.date_range || this.form.date_range.length !== 2) {
          this.$message.error('请选择时间范围')
          return
        }
        if (this.form.continue_training && !this.form.base_model_id) {
          this.$message.error('启用继续训练时，请选择基础模型')
          return
        }
        this.creating = true
        try {
          const payload = {
            ...this.form,
            start_time: this.form.date_range[0],
            end_time: this.form.date_range[1]
          }
          // 如果未启用继续训练，不传递 base_model_id
          if (!payload.continue_training) {
            delete payload.base_model_id
          }
          delete payload.continue_training
          delete payload.date_range
          const { data } = await createModelTraining(payload)
          this.createDialogVisible = false
          this.$message.success('创建成功')
          
          // 刷新列表数据（不等待完成）
          this.loadData()
          
          // 创建成功后自动打开详情页面
          if (data && data.id) {
            // 直接使用返回的数据打开详情页面
            this.selectedTask = data
            
            // 提取任务状态信息
            if (data.config && data.config.task_status) {
              this.taskStatus = data.config.task_status
            } else {
              this.taskStatus = null
            }
            
            this.detailsDialogVisible = true
            
            // 如果任务未完成，开始轮询
            if (data.status === 'running' || data.status === 'pending') {
              this.startDetailPolling(data.id)
            }
          }
        } catch (error) {
          this.$message.error('创建失败')
        }
        this.creating = false
      })
    },
    async viewDetails(row) {
      const { data } = await getModelTrainingTask(row.id)
      this.selectedTask = data
      
      // 提取任务状态信息
      if (data.config && data.config.task_status) {
        this.taskStatus = data.config.task_status
      } else {
        this.taskStatus = null
      }
      
      this.detailsDialogVisible = true
      
      // 如果任务未完成，开始轮询
      if (data.status === 'running' || data.status === 'pending') {
        this.startDetailPolling(row.id)
      } else if (data.status === 'completed') {
        // 任务已完成，渲染图表
        this.$nextTick(() => {
          this.renderCharts()
        })
      }
    },
    startDetailPolling(taskId) {
      // 停止之前的轮询
      this.stopDetailPolling()
      
      this.detailPollTimer = setInterval(async () => {
        try {
          const { data } = await getModelTrainingTask(taskId)
          this.selectedTask = data
          
          // 提取任务状态信息
          if (data.config && data.config.task_status) {
            this.taskStatus = data.config.task_status
          } else {
            this.taskStatus = null
          }
          
          // 如果任务已完成或失败，停止轮询
          if (data.status === 'completed' || data.status === 'failed') {
            this.stopDetailPolling()
            // 如果任务已完成，渲染图表
            if (data.status === 'completed') {
              this.$nextTick(() => {
                this.renderCharts()
              })
            }
          }
        } catch (e) {
          console.error('轮询任务进度失败', e)
        }
      }, 3000) // 详情页轮询间隔3秒
    },
    stopDetailPolling() {
      if (this.detailPollTimer) {
        clearInterval(this.detailPollTimer)
        this.detailPollTimer = null
      }
    },
    handleDialogClose() {
      this.stopDetailPolling()
      this.destroyCharts()
    },
    destroyCharts() {
      // 销毁所有图表实例
      if (this.regressionScatterChart) {
        this.regressionScatterChart.dispose()
        this.regressionScatterChart = null
      }
      if (this.residualHistogramChart) {
        this.residualHistogramChart.dispose()
        this.residualHistogramChart = null
      }
      if (this.probaHistogramChart) {
        this.probaHistogramChart.dispose()
        this.probaHistogramChart = null
      }
    },
    renderCharts() {
      if (!this.selectedTask || this.selectedTask.status !== 'completed') {
        return
      }
      
      const metrics = this.selectedTask.metrics
      if (!metrics) return
      
      const isClassification = this.isClassificationTask(metrics)
      
      if (isClassification) {
        // 分类任务：渲染预测概率分布直方图
        this.renderProbaHistogram(metrics)
      } else {
        // 回归任务：渲染散点图和残差分布直方图
        this.renderRegressionScatter(metrics)
        this.renderResidualHistogram(metrics)
      }
    },
    renderRegressionScatter(metrics) {
      // 获取训练集和验证集的预测值
      const trainMetrics = metrics.new_model?.train || metrics.train
      const valMetrics = metrics.new_model?.validation || metrics.validation
      
      if (!trainMetrics || !trainMetrics.y_pred || !valMetrics || !valMetrics.y_pred) {
        return
      }
      
      // 注意：这里需要真实值，但当前数据结构中没有保存真实值
      // 我们只能展示预测值的分布，或者需要后端提供真实值
      // 暂时只展示预测值（作为示例）
      const trainData = trainMetrics.y_pred.map((pred, idx) => [idx, pred])
      const valData = valMetrics.y_pred.map((pred, idx) => [idx, pred])
      
      const chartRef = this.$refs.regressionScatterChart
      if (!chartRef) return
      
      if (this.regressionScatterChart) {
        this.regressionScatterChart.dispose()
      }
      
      this.regressionScatterChart = echarts.init(chartRef)
      this.regressionScatterChart.setOption({
        title: {
          text: '预测值分布',
          left: 'center',
          textStyle: { fontSize: 14 }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        legend: {
          data: ['训练集', '验证集'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: '样本索引'
        },
        yAxis: {
          type: 'value',
          name: '预测值'
        },
        series: [
          {
            name: '训练集',
            type: 'scatter',
            data: trainData,
            symbolSize: 4,
            itemStyle: { color: '#5470c6', opacity: 0.6 }
          },
          {
            name: '验证集',
            type: 'scatter',
            data: valData,
            symbolSize: 4,
            itemStyle: { color: '#91cc75', opacity: 0.6 }
          }
        ]
      })
    },
    renderResidualHistogram(metrics) {
      const trainMetrics = metrics.new_model?.train || metrics.train
      const valMetrics = metrics.new_model?.validation || metrics.validation
      
      // 优先使用验证集的残差直方图
      const histogram = valMetrics?.residual_histogram || trainMetrics?.residual_histogram
      
      if (!histogram || !histogram.bins || histogram.bins.length === 0) {
        return
      }
      
      const chartRef = this.$refs.residualHistogramChart
      if (!chartRef) return
      
      if (this.residualHistogramChart) {
        this.residualHistogramChart.dispose()
      }
      
      this.residualHistogramChart = echarts.init(chartRef)
      this.residualHistogramChart.setOption({
        title: {
          text: '残差分布',
          left: 'center',
          textStyle: { fontSize: 14 }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: histogram.bins.map(bin => bin.toFixed(6)),
          name: '残差值',
          axisLabel: { rotate: 45 }
        },
        yAxis: {
          type: 'value',
          name: '频数'
        },
        series: [{
          type: 'bar',
          data: histogram.counts,
          itemStyle: { color: '#73c0de' }
        }]
      })
    },
    renderProbaHistogram(metrics) {
      const trainMetrics = metrics.new_model?.train || metrics.train
      const valMetrics = metrics.new_model?.validation || metrics.validation
      
      // 优先使用验证集的概率分布直方图
      const histogram = valMetrics?.y_pred_proba_histogram || trainMetrics?.y_pred_proba_histogram
      
      if (!histogram || !histogram.bins || histogram.bins.length === 0) {
        return
      }
      
      const chartRef = this.$refs.probaHistogramChart
      if (!chartRef) return
      
      if (this.probaHistogramChart) {
        this.probaHistogramChart.dispose()
      }
      
      this.probaHistogramChart = echarts.init(chartRef)
      this.probaHistogramChart.setOption({
        title: {
          text: '预测概率分布',
          left: 'center',
          textStyle: { fontSize: 14 }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: histogram.bins.map(bin => bin.toFixed(4)),
          name: '预测概率',
          axisLabel: { rotate: 45 }
        },
        yAxis: {
          type: 'value',
          name: '频数'
        },
        series: [{
          type: 'bar',
          data: histogram.counts,
          itemStyle: { color: '#fac858' }
        }]
      })
    },
    getPhaseStepClass(status) {
      const statusMap = {
        'completed': 'step-success',
        'running': 'step-running',
        'pending': 'step-pending',
        'failed': 'step-failed'
      }
      return statusMap[status] || 'step-pending'
    },
    getTaskStepClass(status) {
      const statusMap = {
        'completed': 'step-success',
        'running': 'step-running',
        'NoResult': 'step-warning',
        'pending': 'step-pending',
        'failed': 'step-failed'
      }
      return statusMap[status] || 'step-pending'
    },
    formatMetric(value) {
      if (value === null || value === undefined || isNaN(value)) return '-'
      const num = Number(value)
      // 对于非常小的值，使用科学计数法或更多小数位
      if (Math.abs(num) < 0.0001 && num !== 0) {
        return num.toExponential(4)
      }
      return num.toFixed(4)
    },
    formatScore(score, metrics) {
      if (score === null || score === undefined || isNaN(score)) return '-'
      const num = Number(score)
      
      // 判断是分类还是回归任务
      const isClassification = this.isClassificationTask(metrics)
      
      if (isClassification) {
        // 分类任务：accuracy 显示为百分比
        return `${(num * 100).toFixed(2)}%`
      } else {
        // 回归任务：R² 显示为小数
        return num.toFixed(4)
      }
    },
    isClassificationTask(metrics) {
      // 判断是分类任务还是回归任务
      // 如果 metrics 中有 accuracy 字段，则是分类任务
      // 如果 metrics 中有 mse 或 rmse 字段，则是回归任务
      if (!metrics) return false
      
      const trainMetrics = metrics.new_model?.train || metrics.train
      const valMetrics = metrics.new_model?.validation || metrics.validation
      
      if (trainMetrics) {
        if ('accuracy' in trainMetrics) return true
        if ('mse' in trainMetrics || 'rmse' in trainMetrics) return false
      }
      
      if (valMetrics) {
        if ('accuracy' in valMetrics) return true
        if ('mse' in valMetrics || 'rmse' in valMetrics) return false
      }
      
      // 默认返回 false（回归任务）
      return false
    },
    getTrainingProgress() {
      const trainingPhase = this.taskStatus?.phases?.training
      if (!trainingPhase) return 0
      
      // 如果有进度信息，使用进度信息
      if (trainingPhase.progress !== undefined && trainingPhase.progress !== null) {
        return Math.round(trainingPhase.progress * 100)
      }
      
      // 如果有迭代信息，使用迭代信息计算进度
      if (trainingPhase.current_iteration !== undefined && trainingPhase.total_iterations !== undefined) {
        const progress = trainingPhase.current_iteration / trainingPhase.total_iterations
        return Math.round(progress * 100)
      }
      
      // 根据状态返回进度
      if (trainingPhase.status === 'completed') return 100
      if (trainingPhase.status === 'running') return 50
      if (trainingPhase.status === 'failed') return 0
      return 0
    },
    getTrainingProgressText() {
      const trainingPhase = this.taskStatus?.phases?.training
      if (!trainingPhase) return '等待开始'
      
      // 如果有迭代信息，显示迭代进度
      if (trainingPhase.current_iteration !== undefined && trainingPhase.total_iterations !== undefined) {
        return `${trainingPhase.current_iteration} / ${trainingPhase.total_iterations}`
      }
      
      // 如果有进度信息，显示百分比
      if (trainingPhase.progress !== undefined && trainingPhase.progress !== null) {
        return `${Math.round(trainingPhase.progress * 100)}%`
      }
      
      // 根据状态返回文本
      if (trainingPhase.status === 'completed') return '已完成'
      if (trainingPhase.status === 'running') return '训练中...'
      if (trainingPhase.status === 'failed') return '训练失败'
      return '等待开始'
    },
    async handleCopy(row) {
      try {
        // 确保相关数据已加载
        await Promise.all([
          this.loadFactors(),
          this.loadLabelGenerators(),
          this.loadTrainers(),
          this.loadDataConfigs(),
          this.loadModels()
        ])
        
        // 使用列表数据构建表单，避免加载大字段（config 和 metrics）
        // 如果列表数据中没有某些字段，再单独查询（只查询必要字段）
        let taskData = row
        
        // 如果列表数据缺少必要字段，才查询详情（但只查询基本字段）
        if (!row.symbols || !row.timeframes || !row.factor_ids) {
          const { data } = await getModelTrainingTask(row.id)
          taskData = data
        }
        
        // 构建表单数据，复制任务配置
        this.form = {
          name: `${row.name}_副本`,
          description: taskData.description || '',
          data_config_id: taskData.data_config_id,
          symbols: taskData.symbols ? [...taskData.symbols] : [],
          timeframes: taskData.timeframes ? [...taskData.timeframes] : [],
          date_range: taskData.start_time && taskData.end_time ? [taskData.start_time, taskData.end_time] : null,
          factor_ids: taskData.factor_ids ? [...taskData.factor_ids] : [],
          label_generator_id: taskData.label_generator_id,
          trainer_id: taskData.trainer_id,
          train_split_ratio: taskData.train_split_ratio !== undefined ? taskData.train_split_ratio : 0.8,
          continue_training: false,
          base_model_id: undefined
        }
        
        // 清除表单验证状态
        this.$nextTick(() => {
          if (this.$refs.formRef) {
            this.$refs.formRef.clearValidate()
          }
        })
        
        this.createDialogVisible = true
        this.$message.success('已复制任务配置，请修改后提交')
      } catch (error) {
        console.error('复制任务失败:', error)
        this.$message.error('获取任务详情失败，无法复制配置')
      }
    },
    async handleDelete(row) {
      this.$confirm('确定要删除吗?', '提示', { type: 'warning' }).then(async () => {
        await deleteModelTrainingTask(row.id)
        this.$message.success('删除成功')
        this.loadData()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.model-training-page {
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
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.phase-row {
  display: flex;
  margin-bottom: 15px;
  align-items: flex-start;
}

.phase-row-full {
  width: 100%;
}

.phase-label {
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 500;
  margin-right: 15px;
  text-align: center;
}

.phase-label-full {
  width: 100%;
  padding: 12px 16px;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  transition: all 0.3s ease;
}

.phase-label.step-success,
.phase-label-full.step-success {
  background-color: #67c23a;
  color: #fff;
}

.phase-label.step-pending,
.phase-label-full.step-pending {
  background-color: #e4e7ed;
  color: #909399;
}

.phase-label.step-running,
.phase-label-full.step-running {
  background-color: #409eff;
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.phase-label.step-warning,
.phase-label-full.step-warning {
  background-color: #e6a23c;
  color: #fff;
}

.phase-label.step-failed,
.phase-label-full.step-failed {
  background-color: #f56c6c;
  color: #fff;
}

.phase-training-container {
  width: 100%;
}

.phase-training-progress-wrapper {
  width: 100%;
  height: 40px;
  background-color: #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.phase-training-progress-wrapper.step-success {
  background-color: #67c23a;
  color: #fff;
}

.phase-training-progress-wrapper.step-pending {
  background-color: #e4e7ed;
  color: #909399;
}

.phase-training-progress-wrapper.step-running {
  background-color: #409eff;
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.phase-training-progress-wrapper.step-failed {
  background-color: #f56c6c;
  color: #fff;
}

.phase-training-progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  transition: width 0.3s ease;
  background-color: #67c23a;
  min-width: 0;
}

.phase-training-progress-wrapper.step-pending .phase-training-progress-bar {
  display: none;
}

.phase-training-progress-wrapper.step-running .phase-training-progress-bar {
  background-color: #67c23a;
  animation: progress-pulse 2s ease-in-out infinite;
}

.phase-training-progress-text {
  position: relative;
  z-index: 1;
  font-weight: 500;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

@keyframes progress-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.phase-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.task-step {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  cursor: default;
}

.task-step.step-success {
  background-color: #67c23a;
  color: #fff;
}

.task-step.step-pending {
  background-color: #e4e7ed;
  color: #909399;
}

.task-step.step-running {
  background-color: #409eff;
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}

.task-step.step-failed {
  background-color: #f56c6c;
  color: #fff;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>

