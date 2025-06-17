<template>
  <el-card>
    <template #header>
      <div class="header-bar">
        <span>执行器设置</span>
        <el-button type="primary" @click="saveSetting" :loading="saving" style="float:right">保存</el-button>
      </div>
    </template>
    <el-form :model="form" label-width="120px">
      <el-form-item label="路由配置">
        <el-input v-model="form.route_config" type="textarea" :rows="10" />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  route_config: '',
})
const saving = ref(false)

const saveSetting = () => {
  console.log(form.value)
}
</script>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.active {
  background: #f0f7ff;
}

.vertical-divider-col {
  display: flex;
  align-items: stretch;
  justify-content: center;
}
.vertical-divider {
  width: 1px;
  background: #e0e0e0;
  height: 100%;
  min-height: 220px;
  margin: 0 8px;
}
.policy-list {
  padding-right: 8px;
}

.param-disabled {
  pointer-events: none;
  opacity: 0.5;
  filter: grayscale(0.5);
}
</style> 