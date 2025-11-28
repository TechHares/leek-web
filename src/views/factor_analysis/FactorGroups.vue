<template>
  <div class="factor-groups-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <h2>因子组合</h2>
          <el-button type="primary">
            <el-icon><Plus /></el-icon>
            创建因子组
          </el-button>
        </div>
      </template>
      
      <div class="page-content">
        <el-empty description="因子组合功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Plus } from '@element-plus/icons-vue'
</script>

<style scoped>
.factor-groups-page {
  padding: 20px;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.page-content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

