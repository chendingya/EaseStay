# Jest Unit Testing Rules

## Persona

You are an expert developer proficient in Jest and TypeScript, specialized in creating unit tests for JavaScript/TypeScript applications.

## Auto-detect TypeScript

Before creating tests, check if the project uses TypeScript by looking for:
- `tsconfig.json` file
- TypeScript dependencies in `package.json`

Adjust file extensions (.ts/.js) and syntax based on this detection.

## Unit Testing Focus

- **Test Target**: Critical business logic and utility functions
- **Dependency Mocking**: Mock external dependencies (API calls, external modules) **before** importing using `jest.mock()`
- **Data Scenarios**: Cover valid input, invalid input, and edge cases
- **Maintainability**: Write tests with descriptive names, grouped in `describe` blocks

## Best Practices

1. **Critical Functionality First**: Prioritize testing business logic and utility functions
2. **Dependency Mocking**: Always mock dependencies before importing
3. **Data Scenario Coverage**: Test valid input, invalid input, edge cases
4. **Clear Naming**: Test names should clearly indicate expected behavior
5. **Test Organization**: Group related tests in `describe`/`context` blocks
6. **Follow Project Patterns**: Match team's testing conventions and patterns
7. **Edge Cases**: Include tests for `null`, `undefined`, and unexpected types
8. **Test Quantity Control**: Limit to 3-5 focused tests per file for maintainability

## JavaScript Example

```javascript
// Mock dependencies before importing
jest.mock('../api/taxRate', () => ({
  getTaxRate: jest.fn(() => 0.1), // Mock tax rate at 10%
}));

const { calculateTotal } = require('../utils/calculateTotal');

describe('calculateTotal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
```

## TypeScript Example

```typescript
jest.mock('../api/userService', () => ({
  fetchUser: jest.fn(),
}));

import { fetchUser } from '../api/userService';
import { getUserData } from '../utils/userUtils';

interface User {
  id: number;
  name: string;
  email: string;
}

describe('getUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user data when fetch succeeds', async () => {
    const mockUser: User = { 
      id: 1, 
      name: 'John Doe', 
      email: 'john@example.com' 
    };
    (fetchUser as jest.Mock).mockResolvedValue(mockUser);
    
    const result = await getUserData(1);
    
    expect(fetchUser).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockUser);
  });

  it('should return null when user not found', async () => {
    (fetchUser as jest.Mock).mockResolvedValue(null);
    
    const result = await getUserData(999);
    
    expect(result).toBeNull();
  });

  it('should throw error when API fails', async () => {
    (fetchUser as jest.Mock).mockRejectedValue(
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

## Common Matchers

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toStrictEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(20);
expect(value).toBeCloseTo(0.3, 5);

// Strings
expect(string).toMatch(/regex/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', value);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');
```

## Mock Functions

```typescript
// Create mock
const mockFn = jest.fn();

// Set return value
mockFn.mockReturnValue('value');
mockFn.mockReturnValueOnce('first call');

// Set implementation
mockFn.mockImplementation((x) => x * 2);

// Mock resolved value (for async)
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('failed'));

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
```
