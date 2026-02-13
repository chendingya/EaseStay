import { View, Text } from '@tarojs/components'
import './index.css'

export default function GlassButton({
  children,
  onClick,
  tone = 'default',
  size = 'medium',
  block = false,
  loading = false,
  disabled = false,
  className = '',
  style
}) {
  const isDisabled = disabled || loading
  const content = loading ? '处理中...' : children
  const isPlain = typeof content === 'string' || typeof content === 'number'
  const classes = [
    'glass-button',
    `glass-button-${tone}`,
    `glass-button-${size}`,
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
      {isPlain ? <Text className='glass-button-text'>{content}</Text> : content}
    </View>
  )
}
