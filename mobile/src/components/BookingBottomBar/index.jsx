import { View, Text } from '@tarojs/components'
import GlassButton from '../GlassButton'
import './index.css'

export default function BookingBottomBar({
  leftContent = null,
  price,
  priceSuffix = '起',
  emptyText = '暂无可订内容',
  actionText = '立即预订',
  loading = false,
  disabled = false,
  showAction = true,
  onAction,
  bottomOffset = 58,
  className = '',
  actionClassName = ''
}) {
  const hasPrice = price !== null && price !== undefined && price !== ''
  const nextClassName = ['booking-bottom-bar', className].filter(Boolean).join(' ')

  return (
    <View className={nextClassName} style={{ bottom: `${bottomOffset}px` }}>
      {leftContent ? (
        <View className='booking-bottom-bar-left'>{leftContent}</View>
      ) : null}

      <View className='booking-bottom-bar-right'>
        {hasPrice ? (
          <View className='booking-bottom-bar-price'>
            <Text className='booking-bottom-bar-price-prefix'>¥</Text>
            <Text className='booking-bottom-bar-price-value'>{price}</Text>
            <Text className='booking-bottom-bar-price-suffix'>{priceSuffix}</Text>
          </View>
        ) : (
          <Text className='booking-bottom-bar-empty'>{emptyText}</Text>
        )}

        {showAction && hasPrice ? (
          <GlassButton
            tone='primary'
            fill='solid'
            size='large'
            loading={loading}
            disabled={disabled}
            className={actionClassName}
            onClick={onAction}
          >
            {actionText}
          </GlassButton>
        ) : null}
      </View>
    </View>
  )
}
