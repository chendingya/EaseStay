/**
 * userStore — 模块级用户信息缓存
 *
 * 同时维护内存缓存（毫秒级读取）和 Taro Storage（跨冷启动持久化）。
 * 各页面在 useState 初始化时调用 userStore.get() 可立即获得用户信息，
 * 无需等待网络请求，彻底消除登录态加载闪烁。
 */
import Taro from '@tarojs/taro'

const STORAGE_KEY = 'userInfo'

// 内存缓存，应用生命周期内有效
let _user = null

export const userStore = {
  /**
   * 同步读取缓存用户信息。
   * 优先从内存读取，其次从 Storage 恢复（冷启动场景）。
   * @returns {object|null}
   */
  get() {
    if (_user) return _user
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY)
      if (stored && stored.id) {
        _user = stored
        return _user
      }
    } catch (e) {
      // Storage 读取失败时静默降级
    }
    return null
  },

  /**
   * 写入用户信息到内存 + Storage。
   * @param {object|null} user
   */
  set(user) {
    _user = user || null
    try {
      if (user) {
        Taro.setStorageSync(STORAGE_KEY, user)
      } else {
        Taro.removeStorageSync(STORAGE_KEY)
      }
    } catch (e) {}
  },

  /**
   * 清除用户信息（退出登录时调用）。
   */
  clear() {
    _user = null
    try {
      Taro.removeStorageSync(STORAGE_KEY)
    } catch (e) {}
  },

  /**
   * 同步检查是否存在有效 token。
   * @returns {boolean}
   */
  hasToken() {
    try {
      return !!Taro.getStorageSync('token')
    } catch (e) {
      return false
    }
  },
}
