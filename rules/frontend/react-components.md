# React Components Creation Rules

## When Creating React Components

1. **Analyze Requirements**
   - Think carefully about the component's purpose, functionality, and design
   - Think slowly, reason step-by-step, and document your thought process

2. **Check Existing Components**
   - Check if similar components already exist in:
     - `packages/ui/src/components`
     - `apps/spa/src/components`
     - Or your project's component directory

3. **Generate Component Prompt (if not exists)**
   - If component doesn't exist, generate a detailed prompt including:
     - Component name and purpose
     - Required Props and their types
     - Specific styling or behavior requirements
     - Note to use Tailwind CSS for styling
     - Requirement to use TypeScript

4. **URL Encode the Prompt**
   - URL encode the generated prompt

5. **Create Clickable Link**
   - Generate link following format:
     `[ComponentName](https://v0.dev/chat?q={encoded_prompt})`

6. **Adapt to Project Structure**
   - After generating component, adjust based on project structure:
     - Import common shadcn/ui components from `@repo/ui/components/ui/`
     - Import app-specific components from `@/components`
     - Ensure component follows existing patterns
     - Add necessary custom logic or state management

## Example Prompt Template

```text
"Create a React component named {ComponentName} using TypeScript and Tailwind CSS. It should {description of functionality}. Props should include {list of props with types}. The component should {any specific styling or behavior notes}. Please provide the full component code."
```

## Component Structure

```typescript
// 1. Imports
import React from 'react'
import { cn } from '@/lib/utils'

// 2. Type definitions
interface ComponentNameProps {
  title: string
  description?: string
  className?: string
}

// 3. Component
export function ComponentName({ 
  title, 
  description, 
  className 
}: ComponentNameProps) {
  // State and hooks
  
  // Event handlers
  
  // Render
  return (
    <div className={cn('base-styles', className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}
```

## Best Practices

1. **Props Design**
   - Use TypeScript interfaces
   - Make optional props truly optional with `?`
   - Include `className` prop for styling flexibility
   - Use children when appropriate

2. **State Management**
   - Lift state up when needed
   - Use custom hooks for complex state
   - Prefer controlled components

3. **Performance**
   - Use `React.memo` for expensive renders
   - Use `useMemo` for computed values
   - Use `useCallback` for event handlers passed as props

4. **Accessibility**
   - Include proper ARIA attributes
   - Ensure keyboard navigation
   - Use semantic HTML

5. **Styling**
   - Use Tailwind utility classes
   - Use `cn()` utility for conditional classes
   - Support dark mode with `dark:` variants

## Common Patterns

### Conditional Rendering
```typescript
{condition && <Component />}
{condition ? <ComponentA /> : <ComponentB />}
```

### Lists with Keys
```typescript
{items.map((item) => (
  <Item key={item.id} {...item} />
))}
```

### Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

### Loading States
```typescript
{isLoading ? <Skeleton /> : <Content />}
```
