<template>
  <div class="role-management-page">
  <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <span>角色列表</span>
                  </div>
      </template>
      <div class="table-actions">
        <el-input v-model="searchQuery" placeholder="搜索角色..." clearable style="width: 180px;" />
        <el-button type="primary" @click="showCreateRoleModal = true">
          <el-icon><Plus /></el-icon> 新建角色
        </el-button>
      </div>
        <div v-if="loadingRoles" class="text-center py-4">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else>
          <div v-if="filteredRoles.length === 0" class="text-center py-4">
            <p class="mb-0">暂无角色数据</p>
          </div>
          <el-table
            v-else
            :data="filteredRoles"
            style="width: 100%;"
            size="small"
            @row-click="selectRole"
          >
            <el-table-column prop="name" label="角色名" min-width="100" />
            <el-table-column prop="description" label="描述" min-width="120">
              <template #default="{ row }">
                <span v-if="row.description" class="role-desc">{{ row.description }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button size="small" @click.stop="editRole(row)" circle>
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click.stop="confirmDeleteRole(row)" circle>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
    </el-card>

    <!-- 创建角色弹窗 -->
    <el-dialog v-model="showCreateRoleModal" title="新建角色" width="500px">
      <el-form :model="newRole" :rules="roleRules" ref="roleForm" label-width="80px" label-position="left" @submit.prevent="createRole">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="newRole.name" placeholder="请输入角色名称" required />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newRole.description" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item label="选择权限">
          <el-tree
            :data="allPermissions"
            node-key="id"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            :expand-on-click-node="false"
            style="padding-left: 8px;"
          >
            <template #default="{ node, data }">
              <div class="tree-node-row">
                <span>{{ data.label }}</span>
                <template v-if="data.actions">
                  <div class="tree-actions">
                    <el-checkbox-group v-model="selectedActions[data.id]">
                      <el-checkbox
                        v-for="action in sortedActions(data.actions)"
                        :key="action.action"
                        :value="action.action"
                      >
                        {{ action.label }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </template>
              </div>
            </template>
          </el-tree>
        </el-form-item>
        <div class="text-end">
          <el-button @click="showCreateRoleModal = false">取消</el-button>
          <el-button type="primary" :loading="creatingRole" @click="createRole">创建</el-button>
        </div>
      </el-form>
    </el-dialog>

    <!-- 编辑角色弹窗 -->
    <el-dialog v-model="showEditRoleModal" title="编辑角色" width="500px">
      <el-form :model="editedRole" :rules="roleRules" ref="editRoleForm" label-width="80px" label-position="left" @submit.prevent="updateRole">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="editedRole.name" required />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editedRole.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="选择权限">
          <el-tree
            :data="allPermissions"
            node-key="id"
            :props="{ label: 'label', children: 'children' }"
            default-expand-all
            :expand-on-click-node="false"
            style="padding-left: 8px;"
          >
            <template #default="{ node, data }">
              <div class="tree-node-row">
                <span>{{ data.label }}</span>
                <template v-if="data.actions">
                  <div class="tree-actions">
                    <el-checkbox-group v-model="selectedActions[data.id]">
                      <el-checkbox
                        v-for="action in sortedActions(data.actions)"
                        :key="action.action"
                        :value="action.action"
                      >
                        {{ action.label }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </template>
              </div>
            </template>
          </el-tree>
        </el-form-item>
        <div class="text-end">
          <el-button @click="showEditRoleModal = false">取消</el-button>
          <el-button type="primary" :loading="updatingRole" @click="updateRole">保存</el-button>
        </div>
      </el-form>
    </el-dialog>

    <!-- 删除角色确认弹窗 -->
    <el-dialog v-model="showDeleteRoleModal" title="确认删除" width="350px">
      <div>
        <p>确定要删除角色 <strong>{{ roleToDelete?.name }}</strong> 吗？此操作不可撤销。</p>
        <p class="text-danger">如果此角色已被用户使用，则无法删除。</p>
      </div>
      <template #footer>
        <el-button @click="showDeleteRoleModal = false">取消</el-button>
        <el-button type="danger" :loading="deletingRole" @click="deleteRole">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getRoles, createRole, updateRole, deleteRole, getPermissions, updateRolePermissions } from '@/api/role'

export default {
  name: 'RoleManagement',
  data() {
    return {
      roles: [],
      permissions: [],
      allPermissions: [],
      selectedRole: null,
      selectedRolePermissionIds: [],
      loadingRoles: false,
      loadingPermissions: false,
      loadingAllPermissions: false,
      creatingRole: false,
      updatingRole: false,
      creatingPermission: false,
      deletingRole: false,
      savingPermissions: false,
      showCreateRoleModal: false,
      showEditRoleModal: false,
      showCreatePermissionModal: false,
      showDeleteRoleModal: false,
      newRole: {
        name: '',
        description: '',
        permission_ids: []
      },
      editedRole: {
        id: null,
        name: '',
        description: ''
      },
      newPermission: {
        code: '',
        name: '',
        description: '',
        type: 'read'
      },
      roleToDelete: null,
      selectedActions: {},
      roleRules: {
        name: [
          { required: true, message: '请输入角色名称', trigger: 'blur' }
        ]
      },
      searchQuery: ''
    }
  },
  computed: {
    filteredRoles() {
      if (!this.searchQuery) return this.roles
      const q = this.searchQuery.toLowerCase()
      return this.roles.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      )
    }
  },
  created() {
    this.fetchRoles();
    this.fetchAllPermissions();
  },
  methods: {
    async fetchRoles() {
      this.loadingRoles = true;
      try {
        const response = await getRoles();
        this.roles = response.data;
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        this.$toast.error('获取角色列表失败');
      } finally {
        this.loadingRoles = false;
      }
    },
    async fetchAllPermissions() {
      this.loadingAllPermissions = true;
      try {
        const response = await getPermissions();
        this.allPermissions = response.data;
        this.permissions = [...this.allPermissions];
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        this.$toast.error('获取权限列表失败');
      } finally {
        this.loadingAllPermissions = false;
      }
    },
    selectRole(role) {
      this.selectedRole = role;
      // 回显权限
      const selected = {};
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(p => {
          selected[p.id] = Array.isArray(p.actions) ? [...p.actions] : [];
        });
      }
      this.selectedActions = selected;
    },
    buildPermissionsPayload() {
      // selectedActions: { [id]: ['read', 'write'] }
      return Object.entries(this.selectedActions)
        .filter(([_, actions]) => actions && actions.length > 0)
        .map(([id, actions]) => ({
          id,
          actions
        }));
    },
    async createRole() {
      this.creatingRole = true;
      try {
        const payload = {
          name: this.newRole.name,
          description: this.newRole.description,
          permissions: this.buildPermissionsPayload()
        };
        await createRole(payload);
        this.$toast.success('角色创建成功');
        this.showCreateRoleModal = false;
        this.resetNewRole();
        this.fetchRoles();
      } catch (error) {
        console.error('Failed to create role:', error);
        this.$toast.error(error.response?.data?.detail || '创建角色失败');
      } finally {
        this.creatingRole = false;
      }
    },
    resetNewRole() {
      this.newRole = {
        name: '',
        description: '',
        permission_ids: []
      };
      this.selectedActions = {};
    },
    editRole(role) {
      this.editedRole = {
        id: role.id,
        name: role.name,
        description: role.description
      };
      // 回显权限
      const selected = {};
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(p => {
          selected[p.id] = Array.isArray(p.actions) ? [...p.actions] : [];
        });
      }
      this.selectedActions = selected;
      this.showEditRoleModal = true;
    },
    async updateRole() {
      this.updatingRole = true;
      try {
        const permissions = this.buildPermissionsPayload();
        const payload = {
          name: this.editedRole.name,
          description: this.editedRole.description,
          permissions
        };
        await updateRole(this.editedRole.id, payload);
        this.$toast.success('角色更新成功');
        this.showEditRoleModal = false;

        // 更新本地数据
        const index = this.roles.findIndex(r => r.id === this.editedRole.id);
        if (index !== -1) {
          this.roles[index].name = this.editedRole.name;
          this.roles[index].description = this.editedRole.description;
          this.roles[index].permissions = permissions;
        }
      } catch (error) {
        console.error('Failed to update role:', error);
        this.$toast.error(error.response?.data?.detail || '更新角色失败');
      } finally {
        this.updatingRole = false;
      }
    },
    confirmDeleteRole(role) {
      this.roleToDelete = role;
      this.showDeleteRoleModal = true;
    },
    async deleteRole() {
      if (!this.roleToDelete) return;
      
      this.deletingRole = true;
      try {
        await deleteRole(this.roleToDelete.id);
        this.$toast.success('角色删除成功');
        this.showDeleteRoleModal = false;
        
        // 更新本地数据
        this.roles = this.roles.filter(r => r.id !== this.roleToDelete.id);
        
        // 如果删除的是当前选中的角色，清除选中状态
        if (this.selectedRole && this.selectedRole.id === this.roleToDelete.id) {
          this.selectedRole = null;
          this.selectedRolePermissionIds = [];
        }
        
        this.roleToDelete = null;
      } catch (error) {
        console.error('Failed to delete role:', error);
        this.$toast.error(error.response?.data?.detail || '删除角色失败');
      } finally {
        this.deletingRole = false;
      }
    },
    getPermissionBadgeClass(type) {
      switch (type) {
        case 'read':
          return 'badge bg-info';
        case 'write':
          return 'badge bg-success';
        case 'delete':
          return 'badge bg-danger';
        case 'admin':
          return 'badge bg-warning';
        default:
          return 'badge bg-secondary';
      }
    },
    sortedActions(actions) {
      // 固定顺序：读在前，写在后
      return actions.slice().sort((a, b) => {
        if (a.action === 'read' && b.action !== 'read') return -1;
        if (a.action !== 'read' && b.action === 'read') return 1;
        return 0;
      });
    },
    searchRoles() {
      // 仅前端过滤，无需请求
    }
  }
}
</script>

<style scoped>
.role-management-page {
  padding: 20px;
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 0 24px 0 0;
  border-bottom: none;
  box-shadow: none;
}
.header-bar .title {
  font-size: 22px;
  font-weight: bold;
}
.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.main-content {
  max-width: 1200px;
  margin: 0 auto;
}
.list-card {
  border-radius: 12px;
  min-height: 400px;
  margin-bottom: 0;
}
.text-end {
  text-align: right;
}
.mt-3 {
  margin-top: 1.5rem;
}
.ml-1 {
  margin-left: 0.5rem;
}
.ml-2 {
  margin-left: 1rem;
}
.role-desc {
  color: #b0b3b8;
  font-size: 13px;
  margin-left: 2px;
}
.text-muted {
  color: #b0b3b8;
}
.tree-node-row {
  display: flex;
  align-items: center;
  min-height: 32px;
  width: 100%;
}
.tree-actions {
  margin-left: auto;
  display: flex;
  gap: 12px;
  min-width: 120px;
  justify-content: flex-end;
}
.el-tree {
  width: 90% !important;
  box-sizing: border-box;
}
.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.el-table {
  font-size: 14px;
}
</style> 