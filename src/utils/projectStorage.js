/**
 * 项目ID存储工具
 * 使用双层存储策略：sessionStorage（优先） + localStorage（备份）
 * - sessionStorage: 每个TAB独立，支持多TAB查看不同项目
 * - localStorage: 记住用户最后选择，新TAB继承上次选择
 */

const STORAGE_KEY = 'current_project_id'

/**
 * 获取当前项目ID
 * 优先从 sessionStorage 读取，如果没有则从 localStorage 读取
 * @returns {string|null} 项目ID，如果没有则返回null
 */
export function getCurrentProjectId() {
  // 优先读取 sessionStorage（当前TAB的选择）
  let projectId = sessionStorage.getItem(STORAGE_KEY)
  
  // 如果当前TAB没有选择过，从 localStorage 读取（上次使用的项目）
  if (!projectId) {
    projectId = localStorage.getItem(STORAGE_KEY)
    // 如果 localStorage 有值，同步到 sessionStorage
    if (projectId) {
      sessionStorage.setItem(STORAGE_KEY, projectId)
    }
  }
  
  return projectId
}

/**
 * 设置当前项目ID
 * 同时写入 sessionStorage 和 localStorage
 * @param {string|number} id - 项目ID
 */
export function setCurrentProjectId(id) {
  const projectId = String(id)
  sessionStorage.setItem(STORAGE_KEY, projectId)
  localStorage.setItem(STORAGE_KEY, projectId)
}

/**
 * 清除当前项目ID
 * 同时清除 sessionStorage 和 localStorage
 */
export function clearCurrentProjectId() {
  sessionStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 检查是否有项目ID
 * @returns {boolean} 是否有项目选择
 */
export function hasCurrentProjectId() {
  return getCurrentProjectId() !== null
}
