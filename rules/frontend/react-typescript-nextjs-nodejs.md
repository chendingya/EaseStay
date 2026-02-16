# React + TypeScript + Next.js + Node.js Rules

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
- Avoid enums; use const objects or `as const` assertions instead
- Use functional components with TypeScript interfaces

## Syntax and Formatting

- Use arrow functions for components and handlers
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements
- Use declarative JSX

## UI and Styling

- Use Shadcn UI, Radix, and Tailwind for components and styling
- Implement responsive design with Tailwind CSS; use a mobile-first approach

## Performance Optimization

- Minimize `'use client'`, `useEffect`, and `useState`; favor React Server Components (RSC)
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Optimize images: use Next.js Image component, include size data, implement lazy loading

## Error Handling

### Prioritize Error Handling and Edge Cases
- Handle errors and edge cases at the beginning of functions
- Use early returns for guard clauses to avoid deep nesting
- Implement proper error logging and user-friendly error messages
- Consider using custom error types or error factories for consistent error handling

### Error Boundary Example
```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }
    return this.props.children
  }
}
```

## File Structure Example

```typescript
// 1. Imports
import { useState } from 'react'
import { cn } from '@/lib/utils'

// 2. Types
interface ComponentProps {
  title: string
  children: React.ReactNode
}

// 3. Helper Functions
const formatDate = (date: Date) => date.toLocaleDateString()

// 4. Subcomponents
const SubComponent = ({ value }: { value: string }) => <span>{value}</span>

// 5. Main Component
export function Component({ title, children }: ComponentProps) {
  // State
  const [isOpen, setIsOpen] = useState(false)
  
  // Handlers
  const handleToggle = () => setIsOpen(prev => !prev)
  
  // Render
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

// 6. Static Content
const DEFAULT_TITLE = 'Untitled'
```

## Conditional Statements

```typescript
// Prefer early returns
const processData = (data: Data | null) => {
  if (!data) return null
  if (data.isEmpty) return EMPTY_RESULT
  
  // Main logic
  return transform(data)
}

// Single line without braces for simple conditions
if (condition) doSomething()

// Guard clauses
const validateInput = (input: string) => {
  if (!input) throw new Error('Input required')
  if (input.length < 3) throw new Error('Too short')
  
  return input.trim()
}
```

## Key Conventions

- Minimize `'use client'`:
  - Favor server components and Next.js SSR
  - Use only for Web API access in small components
  - Avoid for data fetching or state management
- Optimize Web Vitals (LCP, CLS, FID)
- Follow Next.js docs for Data Fetching, Rendering, and Routing
