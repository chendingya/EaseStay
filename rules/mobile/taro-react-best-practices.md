# Taro + React Mini Program Best Practices

> Note: This skill is adapted from React Native Expo best practices for Taro framework compatibility.

## Core Best Practices

```javascript
const taroReactBestPractices = [
  "Use functional components and hooks",
  "Leverage Taro APIs and components",
  "Use Taro Router for proper navigation",
  "Implement proper error handling",
  "Follow WeChat Mini Program guidelines",
  "Optimize for performance"
];
```

## Directory Structure

```
src/
  components/
    common/
    business/
  pages/
    index/
    user/
    hotel/
  hooks/
    useAuth.ts
    useRequest.ts
  utils/
    helpers.ts
    constants.ts
  services/
    api.ts
    storage.ts
  store/
    index.ts
    modules/
  types/
    index.ts
  app.config.ts
  app.tsx
project.config.json
config/
  index.ts
  dev.ts
  prod.ts
```

## Component Structure

```typescript
// components/common/Button/index.tsx
import { View, Text } from '@tarojs/components'
import { FC } from 'react'
import './index.scss'

interface Props {
  title: string
  type?: 'primary' | 'secondary'
  disabled?: boolean
  onClick?: () => void
}

export const Button: FC<Props> = ({ 
  title, 
  type = 'primary', 
  disabled = false,
  onClick 
}) => {
  return (
    <View 
      className={`btn btn-${type} ${disabled ? 'btn-disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <Text>{title}</Text>
    </View>
  )
}
```

## Navigation with Taro

```typescript
import Taro from '@tarojs/taro'

// Navigate to page
Taro.navigateTo({
  url: '/pages/hotel/detail?id=123'
})

// Redirect
Taro.redirectTo({
  url: '/pages/login/index'
})

// Go back
Taro.navigateBack({
  delta: 1
})

// Switch tab
Taro.switchTab({
  url: '/pages/index/index'
})
```

## Custom Hooks

```typescript
// hooks/useRequest.ts
import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'

export function useRequest<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    
    try {
      const token = Taro.getStorageSync('token')
      const res = await Taro.request({
        url,
        method: 'GET',
        data: params,
        header: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.statusCode === 200) {
        setData(res.data as T)
      } else {
        throw new Error(res.data.message || 'Request failed')
      }
    } catch (e) {
      setError(e as Error)
      Taro.showToast({
        title: '请求失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [url])

  return { data, loading, error, fetchData }
}
```

## API Service Pattern

```typescript
// services/api.ts
import Taro from '@tarojs/taro'

const BASE_URL = 'https://api.example.com'

const request = async <T>(
  url: string,
  options: Taro.request.Option = {}
): Promise<T> => {
  const token = Taro.getStorageSync('token')
  
  const res = await Taro.request({
    url: `${BASE_URL}${url}`,
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.header
    },
    ...options
  })
  
  if (res.statusCode === 401) {
    Taro.removeStorageSync('token')
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new Error('Unauthorized')
  }
  
  if (res.statusCode >= 400) {
    throw new Error(res.data?.message || 'Request failed')
  }
  
  return res.data as T
}

export const api = {
  get: <T>(url: string, data?: object) => 
    request<T>(url, { method: 'GET', data }),
  
  post: <T>(url: string, data?: object) => 
    request<T>(url, { method: 'POST', data }),
  
  put: <T>(url: string, data?: object) => 
    request<T>(url, { method: 'PUT', data }),
  
  delete: <T>(url: string) => 
    request<T>(url, { method: 'DELETE' })
}
```

## State Management (Redux)

```typescript
// store/modules/user.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UserState {
  info: UserInfo | null
  token: string | null
}

const initialState: UserState = {
  info: null,
  token: null
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserInfo>) => {
      state.info = action.payload
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
    },
    logout: (state) => {
      state.info = null
      state.token = null
    }
  }
})

export const { setUser, setToken, logout } = userSlice.actions
export default userSlice.reducer
```

## Performance Tips

1. Use `useMemo` for computed values
2. Use `useCallback` for event handlers
3. Avoid inline styles in render
4. Use `Taro.memo` for expensive components
5. Implement virtual lists for long lists
6. Lazy load images with `Image` component `lazyLoad` prop

## Platform-Specific Code

```typescript
// Conditional rendering
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'

const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

export const Component = () => {
  return (
    <View>
      {isWeapp && <WeappSpecificComponent />}
    </View>
  )
}
```

## Common Taro APIs

```typescript
// Storage
Taro.setStorageSync('key', value)
Taro.getStorageSync('key')
Taro.removeStorageSync('key')

// Navigation
Taro.navigateTo({ url })
Taro.navigateBack()
Taro.redirectTo({ url })

// UI Feedback
Taro.showToast({ title: 'Success', icon: 'success' })
Taro.showLoading({ title: 'Loading...' })
Taro.hideLoading()
Taro.showModal({ title: 'Confirm', content: 'Are you sure?' })

// Location
Taro.getLocation({ type: 'gcj02' })

// Payment
Taro.requestPayment({ ... })
```

## WeChat Mini Program Guidelines

1. Keep package size under 2MB (main package)
2. Use subpackages for larger apps
3. Optimize images and assets
4. Follow WeChat design guidelines
5. Test on real devices
6. Handle network errors gracefully
7. Implement proper loading states
