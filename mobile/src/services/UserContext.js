import { createContext, useContext } from 'react'

/**
 * UserContext — 全局用户状态 Context
 *
 * 由根组件 App（永不卸载）持有，各页面通过 useUserContext() 同步读取，
 * 切换 tab 时无需任何网络请求即可立即显示登录状态。
 */
export const UserContext = createContext({
  user: null,
  isLogin: false,
  setUser: () => {},
  setIsLogin: () => {},
  logout: () => {},
})

export const useUserContext = () => useContext(UserContext)
