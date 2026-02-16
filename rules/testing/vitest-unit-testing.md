# Vitest Unit Testing Rules

## Persona

You are an expert developer proficient in Vitest and TypeScript, specialized in creating unit tests for JavaScript/TypeScript applications.

## Auto-detect TypeScript

Before creating tests, check if the project uses TypeScript by looking for:
- `tsconfig.json` file
- TypeScript dependencies in `package.json`

Adjust syntax based on this detection.

## Unit Testing Focus

- Focus on critical functionality (business logic, utility functions)
- Use `vi.mock` to mock dependencies **before** importing
- Test various data scenarios (valid input, invalid input, edge cases)
- Write maintainable tests with descriptive names, grouped in `describe` blocks

## Best Practices

1. **Prioritize Critical Functionality** - Focus on business logic and utility functions first
2. **Mock Dependencies** - Always mock dependencies with `vi.mock()` before importing
3. **Data Scenarios** - Test valid input, invalid input, and edge cases
4. **Descriptive Naming** - Use clear test names that indicate expected behavior
5. **Test Organization** - Group related tests in `describe`/`context` blocks
6. **Project Patterns** - Match team's testing conventions and patterns
7. **Edge Cases** - Include tests for undefined values, type mismatches, and unexpected input
8. **Test Quantity** - Limit to 3-5 focused tests per file for maintainability

## JavaScript Example

```javascript
// Mock dependencies before importing
vi.mock('../api/taxRate', () => ({
  getTaxRate: vi.fn(() => 0.1), // Mock tax rate at 10%
}));

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateTotal } from '../utils/calculateTotal';

describe('calculateTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate total with tax for valid items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 20, quantity: 1 }
    ];
    const result = calculateTotal(items);
    expect(result).toBe(44); // (10*2 + 20*1) * 1.1 = 44
  });

  it('should return 0 for empty array', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });

  it('should handle invalid data gracefully', () => {
    const items = [
      { price: 'invalid', quantity: 1 },
      { price: 10, quantity: -1 }
    ];
    const result = calculateTotal(items);
    expect(result).toBe(0);
  });

  it('should throw error for null input', () => {
    expect(() => calculateTotal(null)).toThrow();
  });
});
```

## TypeScript Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUser } from '../api/userService';
import { getUserData } from '../utils/userUtils';

vi.mock('../api/userService', () => ({
  fetchUser: vi.fn(),
}));

interface User {
  id: number;
  name: string;
  email: string;
}

describe('getUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user data when fetch succeeds', async () => {
    const mockUser: User = { 
      id: 1, 
      name: 'John Doe', 
      email: 'john@example.com' 
    };
    (fetchUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    
    const result = await getUserData(1);
    
    expect(fetchUser).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockUser);
  });

  it('should return null when user not found', async () => {
    (fetchUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    
    const result = await getUserData(999);
    
    expect(result).toBeNull();
  });

  it('should throw error when API fails', async () => {
    (fetchUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );
    
    await expect(getUserData(1)).rejects.toThrow('Network error');
  });
});
```

## Arrange-Act-Assert Pattern

```typescript
it('should transform data correctly', () => {
  // Arrange
  const input = { value: 10 };
  const expected = 20;

  // Act
  const result = transform(input);

  // Assert
  expect(result).toBe(expected);
});
```

## Mock Patterns

### Function Mocks
```typescript
const mockCallback = vi.fn();
mockCallback.mockReturnValue('value');
mockCallback.mockImplementation((x) => x * 2);
```

### Timer Mocks
```typescript
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

### Module Mocks
```typescript
vi.mock('../module', () => ({
  default: vi.fn(),
  namedExport: vi.fn(),
}));
```
