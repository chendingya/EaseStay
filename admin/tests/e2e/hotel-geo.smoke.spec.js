import { expect, test } from '@playwright/test'
import { seedSession } from './helpers/auth'
import { createHotelFixture, installApiMock } from './helpers/mockApi'

test.describe('Hotel geo smoke', () => {
  test('create hotel submits lat/lng in payload', async ({ page }) => {
    let createPayload = null
    await seedSession(page, { role: 'merchant', username: 'merchant_geo' })
    await installApiMock(page, {
      onCreateHotel: (payload) => {
        createPayload = payload
      }
    })

    await page.goto('/hotels/new')

    await page.locator('#hotel-edit-city-input').click()
    await page.locator('#hotel-edit-city-input').fill('上海')
    await page.locator('#hotel-edit-city-input').press('Enter')
    await page.locator('#hotel-edit-address-input').fill('黄浦区自动化路 88 号')
    await page.locator('#hotel-edit-name-input').fill('经纬度测试酒店')
    await page.locator('#hotel-edit-lat-input').fill('31.2304')
    await page.locator('#hotel-edit-lng-input').fill('121.4737')

    await page.getByTestId('hotel-edit-submit').click()

    await expect.poll(() => createPayload).not.toBeNull()
    expect(createPayload.lat).toBe(31.2304)
    expect(createPayload.lng).toBe(121.4737)
    await expect(page).toHaveURL(/\/hotels$/)
  })

  test('edit hotel can update lat/lng', async ({ page }) => {
    let updatePayload = null
    await seedSession(page, { role: 'merchant', username: 'merchant_geo' })
    await installApiMock(page, {
      hotel: createHotelFixture({ lat: 30.1111, lng: 120.2222 }),
      onUpdateHotel: (payload) => {
        updatePayload = payload
      }
    })

    await page.goto('/hotels/edit/1')

    await expect(page.locator('#hotel-edit-lat-input')).toHaveValue(/30\.1111/)
    await expect(page.locator('#hotel-edit-lng-input')).toHaveValue(/120\.2222/)

    await page.locator('#hotel-edit-lat-input').fill('31.5001')
    await page.locator('#hotel-edit-lng-input').fill('121.7002')
    await page.getByTestId('hotel-edit-submit').click()

    await expect.poll(() => updatePayload).not.toBeNull()
    expect(updatePayload.lat).toBe(31.5001)
    expect(updatePayload.lng).toBe(121.7002)
    await expect(page).toHaveURL(/\/hotels$/)
  })

  test('hotel detail page renders lat/lng', async ({ page }) => {
    await seedSession(page, { role: 'merchant', username: 'merchant_geo' })
    await installApiMock(page, {
      hotel: createHotelFixture({ lat: 31.2999, lng: 121.4888 })
    })

    await page.goto('/hotels/1')

    await expect(page.getByTestId('hotel-detail-lat')).toContainText('31.2999')
    await expect(page.getByTestId('hotel-detail-lng')).toContainText('121.4888')
  })

  test('audit detail page renders lat/lng and can approve', async ({ page }) => {
    let auditPayload = null
    await seedSession(page, { role: 'admin', username: 'admin_geo' })
    await installApiMock(page, {
      role: 'admin',
      hotel: createHotelFixture({ status: 'pending', lat: 31.1234, lng: 121.5678 }),
      onAuditStatusUpdate: (payload) => {
        auditPayload = payload
      }
    })

    await page.goto('/audit/1')

    await expect(page.getByTestId('audit-detail-lat')).toContainText('31.1234')
    await expect(page.getByTestId('audit-detail-lng')).toContainText('121.5678')

    await page.getByTestId('audit-detail-approve').click()
    await expect.poll(() => auditPayload).not.toBeNull()
    expect(auditPayload.status).toBe('approved')
  })
})
