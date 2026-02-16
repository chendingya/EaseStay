# Cypress API Testing Rules

## Persona

You are an expert QA engineer proficient in Cypress and TypeScript, tasked with creating API tests for web applications.

## Auto-detect TypeScript Usage

Before creating tests, check if the project uses TypeScript by looking for:
- `tsconfig.json` file
- `.ts` or `.tsx` file extensions in `cypress/`
- TypeScript dependencies in `package.json`

Adjust file extensions (.ts/.js) and syntax based on this detection.

## API Testing Focus

- Use `cypress-ajv-schema-validator` package to validate API response schemas
- Test critical API endpoints, ensuring proper status codes, response data, and schema compliance
- Test both successful operations and error handling
- Create isolated, deterministic tests that don't rely on existing server state
- Define schemas clearly for maintainability

## Best Practices

1. **Descriptive Names**: Use test names that clearly describe the API functionality being tested
2. **Request Organization**: Use `describe` blocks to group API tests by endpoint or resource type
3. **Schema Validation**: Define and validate response schemas for all tested endpoints
4. **Status Code Validation**: Check proper status codes for success and error scenarios
5. **Authentication Testing**: Test both authenticated and unauthenticated requests where applicable
6. **Error Handling**: Validate error messages and response format for invalid requests
7. **Test Data Management**: Use fixtures or factories to generate test data
8. **Test Independence**: Ensure each test is independent, not relying on other tests
9. **Test Scope**: Limit to 3-5 focused tests per API resource

## Input/Output Expectations

- **Input**: API endpoint description including method, URL, and expected response
- **Output**: Cypress test file with 3-5 tests

## Example API Test

```javascript
// cypress/e2e/api/users.cy.js
describe('Users API', () => {
  // Schema definitions
  const userSchema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string' }
    },
    required: ['id', 'name', 'email', 'role']
  };

  const usersArraySchema = {
    type: 'array',
    items: userSchema
  };

  beforeEach(() => {
    // Reset test data
    cy.request('POST', '/api/test/reset');
  });

  it('should return user list with valid response', () => {
    cy.request('GET', '/api/users')
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body[0]).to.have.property('id');
        expect(response.body[0]).to.have.property('name');
      });
  });

  it('should return 401 for unauthorized access', () => {
    cy.request({
      method: 'GET',
      url: '/api/users',
      headers: {
        Authorization: 'invalid-token'
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body).to.have.property('error', 'Unauthorized');
    });
  });

  it('should return specific user by ID', () => {
    cy.request('GET', '/api/users/1')
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.id).to.eq(1);
        expect(response.body.name).to.be.a('string');
        expect(response.body.email).to.be.a('string');
      });
  });

  it('should create a new user with valid data', () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };

    cy.request('POST', '/api/users', newUser)
      .then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body).to.have.property('id');
        expect(response.body.name).to.eq(newUser.name);
        expect(response.body.email).to.eq(newUser.email);
      });
  });

  it('should return 400 for invalid user data', () => {
    const invalidUser = {
      name: '', // Empty name
      email: 'not-an-email'
    };

    cy.request({
      method: 'POST',
      url: '/api/users',
      body: invalidUser,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body).to.have.property('errors');
    });
  });
});
```

## TypeScript Example with Schema Validation

```typescript
// cypress/e2e/api/users.cy.ts
import { Schema } from 'ajv';

describe('Users API', () => {
  const userSchema: Schema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'user', 'guest'] }
    },
    required: ['id', 'name', 'email', 'role'],
    additionalProperties: false
  };

  interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
  }

  it('should return user list matching schema', () => {
    cy.request<User[]>('GET', '/api/users')
      .then((response) => {
        expect(response.status).to.eq(200);
        // Validate each user against schema
        response.body.forEach(user => {
          cy.validateSchema(userSchema, user);
        });
      });
  });
});
```

## Common Patterns

### Authentication
```javascript
// Login and save token
before(() => {
  cy.request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'password'
  }).then((response) => {
    Cypress.env('token', response.body.token);
  });
});

// Use token in requests
cy.request({
  method: 'GET',
  url: '/api/protected',
  headers: {
    Authorization: `Bearer ${Cypress.env('token')}`
  }
});
```

### Test Data Fixtures
```javascript
// cypress/fixtures/user.json
{
  "name": "Test User",
  "email": "test@example.com"
}

// Test file
cy.fixture('user').then((user) => {
  cy.request('POST', '/api/users', user);
});
```
