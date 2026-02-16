# Tailwind CSS + Next.js Guide

## Core Rules

### TypeScript Rules
- Enable strict mode
- Avoid `any`, prefer `unknown` with runtime checks
- Explicitly type function inputs and outputs
- Use advanced TypeScript features
- Use Biome for code formatting and linting

### Next.js Rules
- Use dynamic routing
- Validate and sanitize route parameters
- Prefer flat, descriptive routes
- Use appropriate data fetching methods
- Implement Incremental Static Regeneration (ISR)
- Use next/image for image optimization
- Configure image properties

### TailwindCSS Rules
- Use TailwindCSS utility classes
- Avoid custom CSS unless absolutely necessary
- Keep consistent ordering of utility classes
- Use responsive variants
- Leverage DaisyUI components to accelerate development

## Prompt Generation Rules

When generating component prompts, include:
1. Thorough analysis of component requirements
2. Specific DaisyUI component suggestions
3. Required Tailwind CSS classes for styling
4. Required TypeScript types or interfaces
5. Responsive design instructions
6. Applicable Next.js features
7. Necessary state management or hooks
8. Accessibility considerations
9. Required icons or resources
10. Error handling and loading states
11. Animation or transition effects (if needed)
12. Required API integration or data fetching
13. Performance optimization techniques (if applicable)
14. Component testing instructions
15. Component documentation requirements

## Common Component Patterns

### Responsive Container
```typescript
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Card Component
```typescript
<div className="card bg-base-100 shadow-xl">
  <figure><img src="..." alt="..." /></figure>
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Description</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

### Form Layout
```typescript
<form className="space-y-4">
  <div className="form-control">
    <label className="label">
      <span className="label-text">Label</span>
    </label>
    <input type="text" className="input input-bordered" />
  </div>
  <button className="btn btn-primary">Submit</button>
</form>
```

### Grid Layout
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

## Utility Class Ordering

Follow this order for consistent class organization:

1. Layout (display, position)
2. Flexbox/Grid
3. Box Model (margin, padding, width, height)
4. Typography
5. Background
6. Border
7. Effects (shadow, opacity)
8. Transitions/Animations
9. Transforms

Example:
```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  {/* Content */}
</div>
```

## Responsive Design

```typescript
// Mobile-first approach
<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text */}
</div>

// Responsive visibility
<div className="hidden md:block">
  {/* Hidden on mobile, visible on md+ */}
</div>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Responsive grid items */}
</div>
```

## Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  loading="lazy"
  className="rounded-lg"
/>
```

## Development Workflow

1. **Code Review**: Thorough code review through Pull Requests
2. **PR Description**: Include clear PR descriptions
3. **Automated Testing**: Implement comprehensive automated testing
4. **Meaningful Tests**: Prioritize meaningful tests
5. **Conventional Commits**: Use conventional commit messages
6. **Small Incremental Commits**: Make small, incremental commits

## Biome Configuration

```json
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

## Best Practices

1. Use TailwindCSS utility classes
2. Avoid custom CSS unless absolutely necessary
3. Keep consistent ordering of utility classes
4. Use responsive variants for all breakpoints
5. Leverage DaisyUI components when available
6. Configure Biome as pre-commit hook
7. Follow Biome recommended rules
8. Ensure consistent code style
9. Run Biome checks before commits
10. Handle all warnings and errors promptly
