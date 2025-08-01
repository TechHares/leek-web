import router from '@/router'

/**
 * 安全的重定向到登录页面
 * @param {string} currentPath - 当前路径
 * @param {boolean} useWindowLocation - 是否使用window.location.href（用于API拦截器）
 */
export function safeRedirectToLogin(currentPath, useWindowLocation = false) {
  // 避免重定向到登录页面本身
  if (currentPath === '/login' || currentPath.startsWith('/login?')) {
    if (useWindowLocation) {
      window.location.href = '/'
    } else {
      router.push('/')
    }
    return
  }
  
  // 正常重定向到登录页面
  const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
  if (useWindowLocation) {
    window.location.href = redirectUrl
  } else {
    router.push(redirectUrl)
  }
}

/**
 * 处理登录成功后的重定向
 * @param {string} redirectParam - 重定向参数
 * @returns {string} 处理后的重定向路径
 */
export function handleLoginRedirect(redirectParam) {
  let redirect = redirectParam || '/'
  
  // 解码redirect参数
  try {
    redirect = decodeURIComponent(redirect)
  } catch (e) {
    console.warn('Failed to decode redirect parameter:', e)
    redirect = '/'
  }
  
  // 检查重定向路径是否有效，避免重定向到登录页面
  if (redirect === '/login' || redirect.startsWith('/login?')) {
    redirect = '/'
  }
  
  return redirect
} 