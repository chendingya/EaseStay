import { View, Text } from '@tarojs/components'
import './index.css'

export default function GlassButton({
  children,
  onClick,
  tone = 'default',
  fill = 'outline',
  size = 'middle',
  block = false,
  loading = false,
  loadingText = '正在加载',
  disabled = false,
  className = '',
  style
}) {
  const isDisabled = disabled || loading
  const content = loading ? loadingText : children
  const isPlain = typeof content === 'string' || typeof content === 'number'
  const sizeClass = size === 'medium' ? 'middle' : size
  const classes = [
    'glass-button',
    `glass-button-${tone}`,
    `glass-button-${sizeClass}`,
    `glass-button-fill-${fill}`,
    loading ? 'glass-button-loading' : '',
    block ? 'glass-button-block' : '',
    isDisabled ? 'glass-button-disabled' : '',
    className
  ].filter(Boolean).join(' ')

  const handleClick = (event) => {
    if (isDisabled) return
    onClick && onClick(event)
  }

  return (
    <View className={classes} style={style} onClick={handleClick}>
      {loading ? <View className='glass-button-spinner' /> : null}
      {isPlain ? <Text className='glass-button-text'>{content}</Text> : content}
    </View>
  )
}
