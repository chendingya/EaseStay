import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { NavBar } from 'antd-mobile'
import { LeftOutline } from 'antd-mobile-icons'
import './index.css'

export default function PageTopBar({
  title = '',
  onBack,
  rightActions = [],
  showBack = true,
  transparent = false,
  fixed = false,
  elevated = false,
  titleStyle,
  titleClassName = '',
  children
}) {
  const handleBack = () => {
    if (!showBack) return
    if (typeof onBack === 'function') {
      onBack()
      return
    }
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack({ delta: 1 })
      return
    }
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  const wrapperClassName = [
    'page-top-bar',
    elevated ? 'elevated' : '',
    transparent ? 'transparent' : '',
    fixed ? 'fixed' : ''
  ].filter(Boolean).join(' ')

  return (
    <View className={wrapperClassName}>
      <NavBar
        backArrow={false}
        className='page-top-bar-navbar'
        left={showBack ? (
          <View className='page-top-bar-left' onClick={handleBack}>
            <LeftOutline className='page-top-bar-back-icon' />
          </View>
        ) : null}
        right={(
          <View className='page-top-bar-right'>
            {rightActions.map((action) => (
              <View
                key={action.key}
                className={`page-top-bar-action ${action.active ? 'active' : ''}`}
                onClick={action.onClick}
              >
                {action.icon}
              </View>
            ))}
          </View>
        )}
      >
        <Text className={`page-top-bar-title ${titleClassName}`} style={titleStyle}>
          {title}
        </Text>
      </NavBar>
      {children ? (
        <View className='page-top-bar-extra'>
          {children}
        </View>
      ) : null}
    </View>
  )
}
