import { useEffect } from 'react'
import { View } from '@tarojs/components'
import GlobalBottomNav from './components/GlobalBottomNav'
import './app.css'

function App(props) {
  useEffect(() => {}, [])
  return (
    <View className='app-shell'>
      <View className='app-content'>{props.children}</View>
      <GlobalBottomNav />
    </View>
  )
}

export default App
