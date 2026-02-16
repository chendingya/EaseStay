# TypeScript + Next.js + Supabase Rules

## Tech Stack

- **TypeScript** - For all code
- **Node.js** - Runtime
- **Next.js App Router** - Framework
- **React** - UI
- **Shadcn UI, Radix UI** - Components
- **Supabase** - Database & Auth
- **Tailwind CSS** - Styling
- **Vercel AI SDK** - AI features

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples
- Use functional and declarative programming patterns; avoid classes
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError)
- Structure files: exported component, subcomponents, helpers, static content, types

## Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard)
- Favor named exports for components

## TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types
- Avoid enums; use const objects or as const assertions instead
- Use functional components with TypeScript interfaces

## Supabase Integration

### Database Querying
```typescript
// services/users.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const userService = {
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
    
    if (error) throw error
    return data
  },

  async getUser(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async createUser(user: CreateUserInput) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
```

### Data Model Creation
```typescript
// Use Supabase's schema builder for migrations
// migrations/001_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

## Performance Optimization

- Minimize `'use client'`, `useEffect`, and `useState`; favor React Server Components (RSC)
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Optimize images: use Next.js Image component, include size data, implement lazy loading

## Key Conventions

### URL State Management
```typescript
// Use 'nuqs' for URL search parameter state management
import { useQueryState } from 'nuqs'

function Component() {
  const [search, setSearch] = useQueryState('search')
  // ...
}
```

### Client Component Guidelines
```typescript
// Minimize 'use client':
// - Favor server components and Next.js SSR
// - Use only for Web API access in small components
// - Avoid for data fetching or state management

'use client'

import { useState } from 'react'

export function ClientComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Error Handling
```typescript
// Use error.tsx for error boundaries
// app/users/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Loading States
```typescript
// Use loading.tsx for loading states
// app/users/loading.tsx
export default function Loading() {
  return <UsersSkeleton />
}
```

## Vercel AI SDK Integration

- Use Vercel AI SDK for building AI-powered features
- Implement AI SDK Core for generating text, structured objects, and tool calls with LLMs
- Utilize AI SDK UI hooks for building chat interfaces
- Leverage AI SDK RSC for streaming generative user interfaces with React Server Components

## SEO and Metadata

```typescript
// Use Next.js 14's metadata API for SEO optimization
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
}
```

## Data Fetching

```typescript
// Use Next.js App Router conventions
// app/users/page.tsx
async function getUsers() {
  const { data } = await supabase.from('users').select('*')
  return data
}

export default async function UsersPage() {
  const users = await getUsers()
  return <UserList users={users} />
}
```

## Best Practices

- Follow Next.js docs for Data Fetching, Rendering, and Routing
- Optimize Web Vitals (LCP, CLS, FID)
- Implement efficient caching and revalidation strategies
- Use route handlers (route.ts) for API routes in the App Router
