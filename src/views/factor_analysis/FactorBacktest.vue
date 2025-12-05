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
        <!-- 回测因子历史表现的功能。选择因子进行回测，设置回测参数（时间范围、标的、数据频率等），
        查看回测结果包括收益曲线、回撤、夏普比率等。支持多因子组合回测，对比不同因子的表现，帮助评估因子的预测能力和稳定性，为因子选择提供依据。 -->
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

