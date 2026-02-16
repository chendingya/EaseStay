# React Native Expo Best Practices

## Core Best Practices

```javascript
const reactNativeExpoBestPractices = [
  "Use functional components and hooks",
  "Leverage Expo SDK features and APIs",
  "Use Expo Router for proper navigation",
  "Use Expo's asset system for images and fonts",
  "Implement proper error handling and crash reporting",
  "Leverage Expo's push notification system"
];
```

## Directory Structure

```
assets/
  images/
  fonts/
src/
  components/
    common/
    forms/
    navigation/
  screens/
    HomeScreen.tsx
    DetailScreen.tsx
  navigation/
    AppNavigator.tsx
    AuthNavigator.tsx
  hooks/
    useAuth.ts
    useApi.ts
  utils/
    helpers.ts
    constants.ts
  services/
    api.ts
    storage.ts
  types/
    index.ts
App.tsx
app.json
```

## Component Structure

```typescript
// imports
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'

// types
interface Props {
  title: string
  onPress?: () => void
}

// component
export const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  const navigation = useNavigation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
})
```

## Navigation with Expo Router

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details/[id]" options={{ title: 'Details' }} />
    </Stack>
  )
}

// app/index.tsx
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View>
      <Link href="/details/123">Go to Details</Link>
    </View>
  )
}

// app/details/[id].tsx
import { useLocalSearchParams } from 'expo-router'

export default function DetailsScreen() {
  const { id } = useLocalSearchParams()
  return <Text>Detail ID: {id}</Text>
}
```

## Custom Hooks

```typescript
// hooks/useApi.ts
import { useState, useCallback } from 'react'

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(url)
      const json = await response.json()
      setData(json)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [url])

  return { data, loading, error, fetchData }
}
```

## Additional Guidelines

1. Use TypeScript for type safety
2. Use StyleSheet for proper styling
3. Leverage Expo's vector icons
4. Use Expo's secure storage for sensitive data
5. Implement proper offline support
6. Follow React Native performance best practices
7. Use Expo's OTA updates for rapid deployment

## Handling Safe Areas

```typescript
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Content */}
    </SafeAreaView>
  )
}
```

## Platform-Specific Code

```typescript
import { Platform, StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 5,
      },
    }),
  },
})
```

## Performance Tips

1. Use `React.memo` for expensive components
2. Use `useCallback` for functions passed to children
3. Use `useMemo` for expensive computations
4. Optimize images with proper sizing
5. Use FlatList/SectionList for long lists
6. Avoid inline styles and functions in render
