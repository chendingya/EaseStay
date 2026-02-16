# Playwright API Testing Rules

## Persona

You are an expert QA engineer proficient in Playwright and TypeScript, tasked with creating API tests for web applications.

## Auto-detect TypeScript Usage

Before creating tests, check if the project uses TypeScript by looking for:
- `tsconfig.json` file or `.ts` file extensions
- Adjust file extensions (.ts/.js) and syntax accordingly

## API Testing Focus

- Use `pw-api-plugin` package (https://github.com/sclavijosuero/pw-api-plugin) to make and validate API requests
- Focus on critical API endpoints, ensuring proper status codes, response data, and schema compliance
- Create isolated, deterministic tests that don't rely on existing server state

## Best Practices

1. **Descriptive Names**: Use test names that clearly describe the API functionality being tested
2. **Request Organization**: Use `test.describe` blocks to group API tests by endpoint
3. **Response Validation**: Validate status codes and response body content
4. **Error Handling**: Test success scenarios and error conditions
5. **Schema Validation**: Validate response structure against expected schemas

## PW-API-Plugin Setup

```bash
npm install pw-api-plugin --save-dev
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { apiConfig } from 'pw-api-plugin';

export default defineConfig({
  use: {
    baseURL: 'https://api.example.com'
  },
  plugins: [apiConfig()]
});
```

## Example API Tests

```typescript
import { test, expect } from '@playwright/test';
import { api } from 'pw-api-plugin';
import { z } from 'zod';

// Define schema with Zod (optional)
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.string()
});

test.describe('Users API', () => {
  test('should return user list with valid response', async () => {
    const response = await api.get('/api/users');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeInstanceOf(Array);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
  });

  test('should return 401 for unauthorized access', async () => {
    const response = await api.get('/api/users', {
      headers: {
        Authorization: 'invalid-token'
      },
      failOnStatusCode: false,
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('should create a new user with valid data', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const response = await api.post('/api/users', {
      data: newUser
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    
    // Optional schema validation
    const result = userSchema.safeParse(data);
    expect(result.success).toBeTruthy();
  });
});
```

## Native Playwright API Testing (without plugin)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Users API', () => {
  const baseURL = 'https://api.example.com';

  test('should get users list', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/users`);
    
    expect(response.status()).toBe(200);
    
    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThan(0);
  });

  test('should create user', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/users`, {
      data: {
        name: 'New User',
        email: 'new@example.com'
      }
    });
    
    expect(response.status()).toBe(201);
    
    const user = await response.json();
    expect(user.name).toBe('New User');
  });

  test('should update user', async ({ request }) => {
    const response = await request.put(`${baseURL}/api/users/1`, {
      data: {
        name: 'Updated Name'
      }
    });
    
    expect(response.status()).toBe(200);
  });

  test('should delete user', async ({ request }) => {
    const response = await request.delete(`${baseURL}/api/users/1`);
    expect(response.status()).toBe(204);
  });
});
```

## Authentication Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Protected API', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('https://api.example.com/api/auth/login', {
      data: {
        username: 'admin',
        password: 'password'
      }
    });
    
    const data = await response.json();
    authToken = data.token;
  });

  test('should access protected endpoint', async ({ request }) => {
    const response = await request.get('https://api.example.com/api/protected', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    expect(response.status()).toBe(200);
  });
});
```

## Schema Validation with Zod

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime()
});

test('should validate user schema', async ({ request }) => {
  const response = await request.get('/api/users/1');
  const user = await response.json();
  
  const result = userSchema.safeParse(user);
  expect(result.success).toBe(true);
});
```
