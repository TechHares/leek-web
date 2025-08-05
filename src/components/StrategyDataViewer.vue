<template>
  <el-dialog
    title="策略数据"
    v-model="dialogVisible"
    width="90%"
    max-width="1200px"
    @close="handleClose"
    class="strategy-data-viewer"
  >
    <template #header>
      <span>策略数据</span>
      <el-button size="small" type="warning" style="margin-left: 16px;" @click="clearData">清空数据</el-button>
      <el-button size="small" type="primary" style="margin-left: 8px;" @click="restartStrategy">重启策略</el-button>
      <el-button size="small" type="danger" style="margin-left: 8px;" @click="deleteInstance" v-if="strategyInstanceIds.length > 1">删除当前实例</el-button>
    </template>
    <div v-if="!strategyData || Object.keys(strategyData).length === 0" class="empty-state">
      <el-empty description="暂无数据" />
    </div>
    <div v-else>
      <div class="instance-selector" v-if="strategyInstanceIds.length > 1">
        <el-tabs v-model="selectedInstanceId" @tab-change="handleInstanceChange" class="instance-tabs">
          <el-tab-pane
            v-for="instanceId in strategyInstanceIds"
            :key="instanceId"
            :label="instanceId"
            :name="instanceId"
          />
        </el-tabs>
      </div>
    <el-descriptions v-if="currentInstanceData" :column="4" border>
        <el-descriptions-item label="状态">
            <span class="label"></span>
            <el-tag :type="getStateTagType(currentInstanceData.state)" effect="light" size="small">
                {{ currentInstanceData.state || '未知' }}
            </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="持仓比例">{{ formatNumber(currentInstanceData.position_rate * 100, 4) }}%</el-descriptions-item>
        <el-descriptions-item label="正在执行方向">
            <el-tag v-if="currentInstanceData.current_command" :type="getPositionSideTag(currentInstanceData.current_command.side)" effect="light" size="small">
                {{ sideZh(currentInstanceData.current_command.side) }}
            </el-tag>
            <span v-else class="empty-text">--</span>
        </el-descriptions-item>
        <el-descriptions-item label="正在执行比例">
            <el-tag v-if="currentInstanceData.current_command" type="info" effect="light" size="small">
                {{ currentInstanceData.current_command.ratio * 100 }}%
            </el-tag>
            <span v-else class="empty-text">--</span>
        </el-descriptions-item>
        <el-descriptions-item label="持仓" :span="4">
            <div v-if="currentInstanceData.position && currentInstanceData.position.length > 0">
                <el-table :data="currentInstanceData.position" border size="small" style="width: 100%">
                  <el-table-column prop="quote_currency" label="计价币种" align="center" >
                    <template #default="scope" align="center">
                    <el-tag type="info">{{ insTypeDesc(scope.row.ins_type) }}</el-tag>
                    {{ scope.row.symbol }} - {{ scope.row.quote_currency }}
                    </template>
                  </el-table-column>
                  <el-table-column label="方向/杠杆" align="center">
                    <template #default="scope">
                      <el-tag :type="getPositionSideTag(scope.row.side)">
                    {{ sideZh(scope.row.side) }}
                    </el-tag>
                    <el-tag :type="scope.row.leverage >= 1 ? 'info' : 'danger'">
                        {{ formatNumber(scope.row.leverage, 2) }}x
                    </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="持仓数量(sz)" align="center">
                    <template #default="scope">
                      {{ calcSz(scope.row) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" align="center">
                    <template #default="scope">
                    <el-tooltip content="平仓" placement="top">
                        <el-button
                        size="small"
                        type="danger"
                        @click="handleClosePosition(scope.row)"
                        circle
                        >
                        <el-icon><Minus /></el-icon>
                        </el-button>
                    </el-tooltip>
                    </template>
                </el-table-column>
                </el-table>
            </div>
            <span v-else class="empty-text">无持仓</span>
        </el-descriptions-item>
        <el-descriptions-item label="策略状态" :span="4">
            <div v-if="currentInstanceData.strategy_state && Object.keys(currentInstanceData.strategy_state).length > 0">
                <el-descriptions :column="1" border size="small">
                    <el-descriptions-item 
                        v-for="(value, key) in getDisplayableStrategyState()" 
                        :key="key" 
                        :label="key">
                        <template #label>
                          <span class="desc-key-fixed">{{ key }}</span>
                        </template>
                        <span v-if="editingStrategyStateKey !== key" class="state-value editable desc-value-fixed" @click="startEditStrategyState(key, value)">{{ value }}</span>
                        <template v-else>
                          <div class="desc-value-fixed">
                            <!-- 布尔类型用 el-select -->
                            <el-select
                              v-if="typeof currentInstanceData.strategy_state[key] === 'boolean'"
                              v-model="editingStrategyStateValue"
                              size="small"
                              @blur="saveStrategyState(key)"
                              @change="saveStrategyState(key)"
                              :teleported="false"
                            >
                              <el-option label="true" :value="true" />
                              <el-option label="false" :value="false" />
                            </el-select>
                            <!-- 其它类型用 el-input -->
                            <el-input
                              v-else
                              v-model="editingStrategyStateValue"
                              size="small"
                              @blur="saveStrategyState(key)"
                              @keyup.enter.native="saveStrategyState(key)"
                            />
                          </div>
                        </template>
                    </el-descriptions-item>
                </el-descriptions>
            </div>
            <span v-else class="empty-text">无状态</span>
        </el-descriptions-item>
      </el-descriptions>
      </div>
  </el-dialog>
</template>

<script>
import { formatNumber } from '@/utils/format'
import { sideZh, getPositionSideTag, insTypeDesc } from '@/utils/enum'
import { getStrategy, updateStrategyState, restartStrategy as restartStrategyAPI, deleteStrategyInstance } from '@/api/strategy'
import { closePosition } from '@/api/position'

export default {
  name: 'StrategyDataViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    strategyId: {
      type: Number,
      required: true
    }
  },
  emits: ['update:visible'],
  data() {
    return {
      selectedInstanceId: null,
      currentInstanceData: null,
      strategyData: null,
      editingStrategyStateKey: null,
      editingStrategyStateValue: '',
      timer: null,
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(value) {
        this.$emit('update:visible', value)
      }
    },
    strategyInstanceIds() {
      if (!this.strategyData || !this.strategyData.data) {
        return []
      }
      return Object.keys(this.strategyData.data)
    }
  },
  mounted() {
    this.fetchStrategy()
    if (!this.timer) {
      this.timer = setInterval(this.fetchStrategy, 8000)
    }
    
    // 检查Element Plus tab滚动功能
    this.$nextTick(() => {
      this.checkElementPlusTabs()
    })
  },
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },
  methods: {
    formatNumber,
    sideZh,
    getPositionSideTag,
    insTypeDesc,
    async fetchStrategy() {
      try {
        const res = await getStrategy(this.strategyId)
        this.strategyData = res.data
        
        // 保存当前选中的实例ID
        const currentSelectedId = this.selectedInstanceId
        
        // 如果当前选中的实例ID仍然存在，保持选中状态
        if (currentSelectedId && this.strategyInstanceIds.includes(currentSelectedId)) {
          this.selectedInstanceId = currentSelectedId
        } else if (this.strategyInstanceIds.length > 0) {
          // 如果当前选中的实例ID不存在，切换到第一个实例
          this.selectedInstanceId = this.strategyInstanceIds[0]
        }
        
        // 更新当前实例数据
        this.handleInstanceChange()
        
        // 检查Element Plus tab滚动功能
        this.$nextTick(() => {
          this.checkElementPlusTabs()
        })
      } catch (e) {
        this.strategyData = null
      }
    },
    handleInstanceChange() {
      if (this.selectedInstanceId && this.strategyData && this.strategyData.data) {
        this.currentInstanceData = this.strategyData.data[this.selectedInstanceId]
      } else {
        this.currentInstanceData = null
      }
    },
    calcSz(position) {
      if (!position.executor_sz) return 0;
      return Object.values(position.executor_sz).reduce((acc, v) => acc + Number(v), 0);
    },
    async handleClosePosition(row) {
      try {
        await this.$confirm('确认平仓该仓位(平仓不会立即修改仓位状态，需要等待策略执行器处理，请勿重复点击)?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await closePosition(row.position_id)
        this.$message.success('平仓成功')
        this.fetchStrategy()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('平仓失败')
        }
      }
    },
    getStateTagType(state) {
      if (!state) return 'info'
      switch (state.toLowerCase()) {
        case 'ready':
          return 'success'
        case 'running':
          return 'warning'
        case 'stopped':
          return 'danger'
        case 'error':
          return 'danger'
        default:
          return 'info'
      }
    },
    handleClose() {
      this.selectedInstanceId = null
      this.currentInstanceData = null
      this.strategyData = null
    },
    startEditStrategyState(key, value) {
      this.editingStrategyStateKey = key
      this.editingStrategyStateValue = value
    },
    async saveStrategyState(key) {
      this.currentInstanceData.strategy_state[key] = this.editingStrategyStateValue
      await updateStrategyState(this.strategyId, this.strategyData.data)
      this.editingStrategyStateKey = null
      this.editingStrategyStateValue = ''
    },
    async clearData() {
      try {
        await this.$confirm('确认清除该策略的运行时数据?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await updateStrategyState(this.strategyId, {})
        this.$message.success('运行时数据已清除')
        this.fetchStrategy()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('清除运行时数据失败')
        }
      }
    },
    getDisplayableStrategyState() {
      if (!this.currentInstanceData || !this.currentInstanceData.strategy_state) {
        return {}
      }
      // 过滤掉 field_extra 字段，不展示给用户
      const displayableState = {}
      for (const [key, value] of Object.entries(this.currentInstanceData.strategy_state)) {
        if (key !== 'field_extra') {
          displayableState[key] = value
        }
      }
      return displayableState
    },
    async restartStrategy() {
      try {
        await restartStrategyAPI(this.strategyId)
        this.$message.success('重启策略成功')
      } catch (error) {
        this.$message.error('重启策略失败')
      }
    },
    async deleteInstance() {
      if (!this.selectedInstanceId) {
        this.$message.warning('请先选择一个实例')
        return
      }
      
      // 检查是否只有一个实例
      if (this.strategyInstanceIds.length <= 1) {
        this.$message.warning('至少需要保留一个实例')
        return
      }
      
      try {
        await this.$confirm('确认删除当前策略实例? 此操作不可恢复。', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await deleteStrategyInstance(this.strategyId, this.selectedInstanceId)
        this.$message.success('删除实例成功')
        
        // 重新获取策略数据
        await this.fetchStrategy()
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除实例失败')
        }
      }
    },
    checkElementPlusTabs() {
      // 检查Element Plus tab组件的滚动状态
      const tabsContainer = document.querySelector('.instance-tabs .el-tabs__nav-wrap')
      if (tabsContainer) {
        const navScroll = tabsContainer.querySelector('.el-tabs__nav-scroll')
        const navPrev = tabsContainer.querySelector('.el-tabs__nav-prev')
        const navNext = tabsContainer.querySelector('.el-tabs__nav-next')
        
        console.log('Element Plus Tabs Debug:', {
          container: tabsContainer,
          navScroll: navScroll,
          navPrev: navPrev,
          navNext: navNext,
          isScrollable: tabsContainer.classList.contains('is-scrollable'),
          prevDisabled: navPrev?.classList.contains('is-disabled'),
          nextDisabled: navNext?.classList.contains('is-disabled'),
          scrollWidth: navScroll?.scrollWidth,
          clientWidth: navScroll?.clientWidth
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.strategy-data-viewer {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.instance-selector {
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
  
  .instance-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }
    
    :deep(.el-tabs__nav-wrap) {
      padding: 0;
    }
    
    :deep(.el-tabs__item) {
      padding: 0 20px;
      height: 32px;
      line-height: 32px;
      white-space: nowrap;
    }
    
    // 确保滚动按钮正常工作
    :deep(.el-tabs__nav-prev),
    :deep(.el-tabs__nav-next) {
      position: absolute;
      top: 0;
      height: 32px;
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      cursor: pointer;
      z-index: 1;
      
      &:hover {
        background: #f5f7fa;
      }
      
      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
    
    :deep(.el-tabs__nav-prev) {
      left: 0;
    }
    
    :deep(.el-tabs__nav-next) {
      right: 0;
    }
    
    :deep(.el-tabs__nav-wrap) {
      position: relative;
      padding: 0 30px; // 为左右按钮留出空间
    }
    
    // 确保滚动容器正常工作
    :deep(.el-tabs__nav-scroll) {
      overflow-x: auto;
      overflow-y: hidden;
    }
  }
}

.json-text {
  margin: 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.state-value {
  color: #303133;
  font-family: monospace;
}

:deep(.el-tag) {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  text-align: right !important;
}

.editable {
  cursor: pointer;
  text-decoration: underline;
}

.desc-key-fixed {
  display: inline-block;
  width: 30%;
  min-width: 40px;
  text-align: right;
}
.desc-value-fixed {
  display: inline-block;
  width: 70%;
  min-width: 60px;
  word-break: break-all;
  vertical-align: middle;
}
</style> 