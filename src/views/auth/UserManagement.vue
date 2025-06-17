<template>
  <div class="user-management">
    <el-card shadow="hover">
      <template #header>
        <div class="header-bar">
          <span>用户列表</span>
        </div>
      </template>
      <div class="table-actions">
        <el-input v-model="searchQuery" placeholder="搜索用户..." clearable @keyup.enter="searchUsers" style="width: 180px;" />
        <el-button type="primary" @click="showCreateUserModal = true">
          <el-icon><Plus /></el-icon> 新建用户
        </el-button>
      </div>
      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column label="角色">
          <template #default="{ row }">
            <el-tag v-for="roleId in row.role_ids" :key="roleId" size="small" class="ml-1">
              {{ roles.find(r => r.id === roleId)?.name || '未知角色' }}
            </el-tag>
            <span v-if="!row.role_ids || row.role_ids.length === 0" class="text-muted">无角色</span>
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">{{ row.is_active ? '活跃' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管理员">
          <template #default="{ row }">
            <el-tag v-if="row.is_admin" type="warning">管理员</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click.stop="editUser(row)" circle>
                <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" @click.stop="confirmDeleteUser(row)" circle>
                <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <!-- 新建用户弹窗 -->
    <el-dialog v-model="showCreateUserModal" title="创建新用户" width="400px">
      <el-form @submit.prevent="createUser" :model="newUser" :rules="userRules" ref="createUserForm" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="newUser.username" required />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="newUser.email" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newUser.password" type="password" required />
        </el-form-item>
        <el-form-item label="状态">
          <el-checkbox v-model="newUser.is_active">活跃</el-checkbox>
        </el-form-item>
        <el-form-item label="管理员">
          <el-checkbox v-model="newUser.is_admin">管理员</el-checkbox>
        </el-form-item>
        <el-form-item label="角色">
          <el-checkbox-group v-model="newUser.role_ids">
            <el-checkbox v-for="role in roles" :key="role.id" :label="role.id">{{ role.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item>
          <el-button @click="showCreateUserModal = false">取消</el-button>
          <el-button type="primary" :loading="creating" @click="createUser">创建</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <!-- 编辑用户弹窗 -->
    <el-dialog v-model="showEditUserModal" title="编辑用户" width="400px">
      <el-form @submit.prevent="updateUser" :model="editedUser" :rules="userRules" ref="editUserForm" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editedUser.username" required disabled />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editedUser.email" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="editedUser.password" type="password" placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="状态">
          <el-checkbox v-model="editedUser.is_active" :disabled="editedUser.id === currentUserId">活跃</el-checkbox>
        </el-form-item>
        <el-form-item label="管理员">
          <el-checkbox v-model="editedUser.is_admin" :disabled="editedUser.id === currentUserId">管理员</el-checkbox>
        </el-form-item>
        <el-form-item label="角色">
          <el-checkbox-group v-model="editedUser.role_ids">
            <el-checkbox v-for="role in roles" :key="role.id" :label="role.id">{{ role.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item>
          <el-button @click="showEditUserModal = false">取消</el-button>
          <el-button type="primary" :loading="updating" @click="updateUser">保存</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <!-- 删除确认弹窗 -->
    <el-dialog v-model="showDeleteConfirmModal" title="确认删除" width="350px">
      <div>
        <p>确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？此操作不可撤销。</p>
      </div>
      <template #footer>
        <el-button @click="showDeleteConfirmModal = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="deleteUser">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getCurrentUser } from '@/api/auth'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/user'
import { getRoles } from '@/api/role'

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      roles: [],
      searchQuery: '',
      loading: false,
      loadingRoles: false,
      creating: false,
      updating: false,
      deleting: false,
      showCreateUserModal: false,
      showEditUserModal: false,
      showDeleteConfirmModal: false,
      currentUserId: null,
      newUser: {
        username: '',
        email: '',
        password: '',
        is_active: true,
        is_admin: false,
        role_ids: []
      },
      editedUser: {
        id: null,
        username: '',
        email: '',
        password: '',
        is_active: true,
        is_admin: false,
        role_ids: []
      },
      userToDelete: null,
      userRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        email: [
          { required: true, message: '请输入邮箱', trigger: 'blur' },
          { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      }
    }
  },
  async created() {
    // 获取当前用户ID
    const user = getCurrentUser()
    this.currentUserId = user ? user.id : null
    this.fetchUsers();
    this.fetchRoles();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await getUsers();
        this.users = response.data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        this.$toast.error('获取用户列表失败');
      } finally {
        this.loading = false;
      }
    },
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
    async createUser() {
      this.$refs.createUserForm.validate(async valid => {
        if (!valid) return;
        this.creating = true;
        try {
          await createUser(this.newUser);
          this.$toast.success('用户创建成功');
          this.showCreateUserModal = false;
          this.resetNewUser();
          this.fetchUsers();
        } catch (error) {
          console.error('Failed to create user:', error);
          this.$toast.error(error.response?.data?.detail || '创建用户失败');
        } finally {
          this.creating = false;
        }
      });
    },
    resetNewUser() {
      this.newUser = {
        username: '',
        email: '',
        password: '',
        is_active: true,
        is_admin: false,
        role_ids: []
      };
    },
    editUser(user) {
      this.editedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        password: '',
        is_active: user.is_active,
        is_admin: user.is_admin,
        role_ids: user.role_ids
      };
      this.showEditUserModal = true;
    },
    async updateUser() {
      this.$refs.editUserForm.validate(async valid => {
        if (!valid) return;
        this.updating = true;
        
        // 创建更新对象，只包含需要更新的字段
        const updateData = {};
        if (this.editedUser.email) updateData.email = this.editedUser.email;
        if (this.editedUser.password) updateData.password = this.editedUser.password;
        updateData.is_active = this.editedUser.is_active;
        updateData.is_admin = this.editedUser.is_admin;
        updateData.role_ids = this.editedUser.role_ids;
        
        try {
          await updateUser(this.editedUser.id, updateData);
          this.$toast.success('用户更新成功');
          this.showEditUserModal = false;
          this.fetchUsers();
        } catch (error) {
          console.error('Failed to update user:', error);
          this.$toast.error(error.response?.data?.detail || '更新用户失败');
        } finally {
          this.updating = false;
        }
      });
    },
    confirmDeleteUser(user) {
      this.userToDelete = user;
      this.showDeleteConfirmModal = true;
    },
    async deleteUser() {
      if (!this.userToDelete) return;
      
      this.deleting = true;
      try {
        await deleteUser(this.userToDelete.id);
        this.$toast.success('用户删除成功');
        this.showDeleteConfirmModal = false;
        this.userToDelete = null;
        this.fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        this.$toast.error(error.response?.data?.detail || '删除用户失败');
      } finally {
        this.deleting = false;
      }
    },
    searchUsers() {
      // 简单的前端搜索实现
      if (!this.searchQuery) {
        this.fetchUsers();
        return;
      }
      
      const query = this.searchQuery.toLowerCase();
      this.users = this.users.filter(user => 
        user.username.toLowerCase().includes(query) || 
        (user.email && user.email.toLowerCase().includes(query))
      );
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 20px;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
}
.el-card {
  margin-bottom: 20px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}
.role-checkboxes {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  padding: 0.5rem;
}
</style> 