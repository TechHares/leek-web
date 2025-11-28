<template>
  <div class="factor-backtest-page">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <h2>因子回测</h2>
        </div>
      </template>
      
      <div class="page-content">
        <el-empty description="因子回测功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup>
</script>

<style scoped>
.factor-backtest-page {
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

