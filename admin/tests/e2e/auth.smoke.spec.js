import { expect, test } from '@playwright/test'
import { installApiMock } from './helpers/mockApi'

test.describe('Auth smoke', () => {
  test('merchant login can redirect to /hotels', async ({ page }) => {
    let loginPayload = null
    await installApiMock(page, {
      role: 'merchant',
      onLogin: (payload) => {
        loginPayload = payload
      }
    })

    await page.goto('/login')
    await page.locator('#login-username-input').fill('merchant_e2e')
    await page.locator('#login-password-input').fill('123456')
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(/\/hotels$/)
    expect(loginPayload).toEqual({
      username: 'merchant_e2e',
      password: '123456'
    })
  })
})
