<template>
  <div class="factor-monitoring-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <h2>因子监控</h2>
        </div>
      </template>
      
      <div class="page-content">
        <el-empty description="因子监控功能开发中..." />
        <!-- 监控实盘因子运行状态的运维功能。实时显示因子计算值，统计因子计算耗时，监控因子数据质量（缺失值、异常值）。
        支持因子异常告警，记录因子使用情况统计。帮助及时发现因子计算问题，保障策略正常运行。 -->
      </div>
    </el-card>
  </div>
</template>

<script setup>
</script>

<style scoped>
.factor-monitoring-page {
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

