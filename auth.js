// 身份验证相关的公共函数

// 后端API基础地址
const AUTH_API_URL = 'https://xinwenredian.onrender.com/api';

/**
 * 检查用户是否已登录
 * @returns {Object|null} 返回用户对象或null(未登录)
 */
function getCurrentUser() {
    // 从 localStorage 或 sessionStorage 中获取用户信息
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('解析用户信息失败:', error);
        // 清除无效的用户数据
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        return null;
    }
}

/**
 * 检查用户登录状态，未登录时重定向到登录页面
 * @param {boolean} redirect - 是否需要重定向到登录页面
 * @returns {boolean} 是否已登录
 */
function checkAuth(redirect = true) {
    const user = getCurrentUser();
    
    if (!user && redirect) {
        // 记录当前页面URL，以便登录后返回
        const currentPage = window.location.pathname;
        
        // 如果当前不是登录或注册页面，则保存当前页面URL
        if (currentPage !== '/login.html' && currentPage !== '/register.html') {
            sessionStorage.setItem('redirectAfterLogin', currentPage);
        }
        
        // 重定向到登录页面
        window.location.href = 'login.html';
    }
    
    return !!user;
}

/**
 * 退出登录
 */
function logout() {
    // 清除用户数据
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    // 重定向到登录页面
    window.location.href = 'login.html';
}

/**
 * 登录成功后的处理
 * @param {Object} userData - 用户数据
 * @param {boolean} remember - 是否记住登录状态
 */
function handleLoginSuccess(userData, remember) {
    // 保存用户信息
    if (remember) {
        localStorage.setItem('user', JSON.stringify(userData));
    } else {
        sessionStorage.setItem('user', JSON.stringify(userData));
    }
    
    // 检查是否有登录后的重定向页面
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin'); // 清除重定向信息
    
    // 如果有重定向页面，则跳转到该页面，否则跳转到首页
    window.location.href = redirectUrl || 'index.html';
} 