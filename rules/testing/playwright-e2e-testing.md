# Playwright E2E Testing Rules

## Persona

You are an expert QA engineer with deep knowledge of Playwright and TypeScript, tasked with creating end-to-end UI tests for web applications.

## Auto-detect TypeScript Usage

Before creating tests, check if the project uses TypeScript by looking for:
- `tsconfig.json` file
- `.ts` file extensions in test directory
- TypeScript dependencies in `package.json`

Adjust file extensions (.ts/.js) and syntax based on this detection.

## End-to-End UI Testing Focus

- Focus on critical user flows (login, checkout, registration, etc.)
- Validate navigation paths, state updates, and error handling
- Use test IDs or semantic selectors, not CSS or XPath
- Use `page.route` for API mocking to create isolated tests

## Best Practices

1. **Descriptive Naming**: Test names should clearly describe the behavior being tested
2. **Proper Setup**: Include setup in `test.beforeEach` blocks
3. **Selector Usage**: Prefer `data-testid` or semantic selectors
4. **Waiting Strategies**: Leverage Playwright's auto-waiting, avoid explicit waits
5. **Mock Dependencies**: Use `page.route` to mock external dependencies
6. **Validation Coverage**: Validate both success and error scenarios
7. **Test Focus**: Limit to 3-5 focused tests per file
8. **Visual Testing**: Avoid testing visual styles directly
9. **Test Basis**: Create tests based on user stories or common flows

## Input/Output Expectations

- **Input**: Web application feature description or user story
- **Output**: Playwright test file with 3-5 tests

## Example Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    
    // Mock API
    await page.route('**/api/login', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      
      if (body.username === 'validUser' && body.password === 'validPass') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Login successful', token: 'fake-token' })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      }
    });
  });

  test('should allow user to log in with valid credentials', async ({ page }) => {
    await page.getByTestId('username').fill('validUser');
    await page.getByTestId('password').fill('validPass');
    await page.getByTestId('submit').click();

    await expect(page.getByTestId('welcome-message')).toBeVisible();
    await expect(page.getByTestId('welcome-message')).toContainText('Welcome');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByTestId('username').fill('invalidUser');
    await page.getByTestId('password').fill('wrongPass');
    await page.getByTestId('submit').click();

    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('Invalid credentials');
  });
});
```

## Page Object Model

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.submitButton = page.getByTestId('submit');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login successfully', async ({ page }) => {
    await loginPage.login('validUser', 'validPass');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

## API Mocking

```typescript
// Mock single request
await page.route('**/api/users', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Test User' }])
  });
});

// Mock based on request
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  
  if (url.includes('/users')) {
    await route.fulfill({ body: '[]' });
  } else {
    await route.continue();
  }
});
```

## Common Assertions

```typescript
// Visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).not.toBeVisible();

// Text content
await expect(locator).toHaveText('Expected Text');
await expect(locator).toContainText('partial');

// Attributes
await expect(locator).toHaveAttribute('href', '/path');
await expect(locator).toHaveClass('active');

// State
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeChecked();

// Count
await expect(locator).toHaveCount(3);
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```
