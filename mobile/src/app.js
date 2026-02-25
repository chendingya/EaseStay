import { useCallback, useEffect, useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import GlobalBottomNav from './components/GlobalBottomNav'
import GlassToastHost from './components/GlassToast'
import { UserContext } from './services/UserContext'
import { userStore } from './services/userStore'
import { getCurrentUser } from './services/auth'
import './app.css'

function App(props) {
  // 根组件永不卸载，持有用户状态，切换 tab 时子页面通过 Context 同步读取
  const [user, setUser] = useState(() => userStore.get())
  const [isLogin, setIsLogin] = useState(() => userStore.hasToken())

  // 应用启动时，若有 token 则静默验证并刷新用户信息
  useEffect(() => {
    if (!userStore.hasToken()) return
    getCurrentUser()
      .then((res) => {
        if (res && res.id) {
          setUser(res)
          setIsLogin(true)
        }
      })
      .catch(() => {
        // token 失效时不主动弹 toast，由 account 页处理
      })
  }, [])

  const logout = useCallback(() => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('userRole')
    userStore.clear()
    setUser(null)
    setIsLogin(false)
  }, [])

  return (
    <UserContext.Provider value={{ user, isLogin, setUser, setIsLogin, logout }}>
      <View className='app-shell'>
        <View className='app-content'>{props.children}</View>
        <GlobalBottomNav />
        <GlassToastHost />
      </View>
    </UserContext.Provider>
  )
}

export default App
