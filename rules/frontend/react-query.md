# React Query Best Practices

## Configuration

```javascript
const preferFunctionalComponents = true;
```

- Use functional components with hooks instead of class components

## React Query Best Practices

```javascript
const reactQueryBestPractices = [
  "Use QueryClient and QueryClientProvider at the root of your application",
  "Implement custom hooks for queries and mutations",
  "Leverage query keys for effective caching",
  "Use prefetching to improve performance",
  "Implement proper error and loading state handling",
];
```

## Recommended Folder Structure

```
src/
  components/
  hooks/
    useQueries/
    useMutations/
  pages/
  utils/
  api/
```

## Query Client Setup

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  )
}
```

## Custom Query Hooks

```typescript
// hooks/useQueries/useUserQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUser(id),
    enabled: !!id, // Only run if id exists
  })
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.updateUser,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

## Query Keys Pattern

```typescript
// utils/queryKeys.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Usage
useQuery({ queryKey: userKeys.list({ status: 'active' }) })
useQuery({ queryKey: userKeys.detail(userId) })
```

## Optimistic Updates

```typescript
export const useUpdateUserOptimistic = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.updateUser,
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', newUser.id] })
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['user', newUser.id])
      
      // Optimistically update
      queryClient.setQueryData(['user', newUser.id], newUser)
      
      return { previousUser }
    },
    onError: (err, newUser, context) => {
      // Rollback on error
      queryClient.setQueryData(['user', newUser.id], context?.previousUser)
    },
    onSettled: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['user', newUser.id] })
    },
  })
}
```

## Component Usage

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useUser(userId)
  const updateUser = useUpdateUser()
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorState error={error} />
  if (!user) return null
  
  const handleUpdate = (updates: Partial<User>) => {
    updateUser.mutate({ id: userId, ...updates })
  }
  
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => handleUpdate({ name: 'New Name' })}>
        Update
      </button>
    </div>
  )
}
```

## Additional Guidelines

1. Use TypeScript for React Query type safety
2. Implement proper error boundaries for query errors
3. Use React Query DevTools for debugging
4. Use stale-while-revalidate strategy for data freshness
5. Implement optimistic updates for mutations
6. Use query invalidation to trigger data refetches
7. Follow React Query naming conventions for consistency

## DevTools Setup

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```
