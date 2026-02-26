const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    headers: jsonHeaders,
    body: JSON.stringify(body)
  })

const readBody = (request) => {
  try {
    return request.postDataJSON() || {}
  } catch {
    return {}
  }
}

export const createHotelFixture = (overrides = {}) => ({
  id: 1,
  name: 'E2E Hotel',
  name_en: 'E2E Hotel EN',
  status: 'approved',
  city: '上海',
  address: '黄浦区测试路 100 号',
  lat: 31.2304,
  lng: 121.4737,
  star_rating: 5,
  opening_time: '2020-01-01',
  description: 'Playwright smoke hotel',
  images: ['https://example.com/hotel.jpg'],
  roomTypes: [],
  promotions: [],
  facilities: ['WiFi'],
  nearby_attractions: ['外滩'],
  nearby_transport: ['地铁 2 号线'],
  nearby_malls: ['国金中心'],
  merchant_id: 9,
  created_at: '2026-01-01T08:00:00.000Z',
  ...overrides
})

export async function installApiMock(page, options = {}) {
  const {
    role = 'merchant',
    hotel = createHotelFixture(),
    pendingHotels = [createHotelFixture({ id: 11, status: 'pending' })],
    pendingRequests = [],
    onLogin,
    onCreateHotel,
    onUpdateHotel,
    onAuditStatusUpdate
  } = options

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = new URL(request.url())
    const path = url.pathname
    const query = url.searchParams

    if (path === '/api/auth/login' && method === 'POST') {
      const body = readBody(request)
      onLogin?.(body)
      return json(route, { token: 'e2e-token', userRole: role })
    }

    if (path === '/api/notifications/unread-count' && method === 'GET') {
      return json(route, { count: 0 })
    }
    if (path === '/api/notifications' && method === 'GET') {
      return json(route, [])
    }
    if (path === '/api/notifications/read-all' && method === 'PUT') {
      return json(route, { success: true })
    }
    if (/^\/api\/notifications\/\d+\/read$/.test(path) && method === 'PUT') {
      return json(route, { success: true })
    }
    if (/^\/api\/notifications\/\d+$/.test(path) && method === 'DELETE') {
      return json(route, { success: true })
    }

    if (path === '/api/presets' && method === 'GET') {
      return json(route, {
        success: true,
        data: {
          facilities: ['WiFi', '健身房'],
          roomTypes: [],
          promotionTypes: [],
          cities: ['上海', '北京']
        }
      })
    }

    if (path === '/api/requests' && method === 'GET') {
      return json(route, [])
    }

    if (path === '/api/merchant/hotels' && method === 'GET') {
      return json(route, { page: 1, pageSize: 10, total: 1, list: [hotel] })
    }
    if (path === '/api/merchant/hotels' && method === 'POST') {
      const body = readBody(request)
      onCreateHotel?.(body)
      return json(route, { id: 99, ...body })
    }
    if (path === '/api/merchant/hotels/cities' && method === 'GET') {
      return json(route, ['上海'])
    }
    if (path === '/api/merchant/hotels/overview' && method === 'GET') {
      return json(route, { total: 1, pending: 0, approved: 1, offline: 0 })
    }
    if (path === '/api/merchant/hotels/1' && method === 'GET') {
      return json(route, hotel)
    }
    if (path === '/api/merchant/hotels/1' && method === 'PUT') {
      const body = readBody(request)
      onUpdateHotel?.(body)
      return json(route, { success: true })
    }
    if (path === '/api/merchant/hotels/1/overview' && method === 'GET') {
      return json(route, { total: 0, used: 0, available: 0, offline: 0 })
    }
    if (path === '/api/merchant/hotels/1/orders' && method === 'GET') {
      return json(route, { page: 1, pageSize: 8, total: 0, list: [] })
    }
    if (path === '/api/merchant/hotels/1/order-stats' && method === 'GET') {
      return json(route, {})
    }

    if (path === '/api/admin/hotels' && method === 'GET' && query.get('status') === 'pending') {
      return json(route, pendingHotels)
    }
    if (path === '/api/admin/requests' && method === 'GET' && query.get('status') === 'pending') {
      return json(route, pendingRequests)
    }
    if (path === '/api/admin/hotels/1' && method === 'GET') {
      return json(route, { ...hotel, status: hotel.status || 'pending' })
    }
    if (path === '/api/admin/hotels/1/overview' && method === 'GET') {
      return json(route, { total: 0, used: 0, available: 0, offline: 0 })
    }
    if (path === '/api/admin/hotels/1/orders' && method === 'GET') {
      return json(route, { page: 1, pageSize: 8, total: 0, list: [] })
    }
    if (path === '/api/admin/requests' && method === 'GET' && query.get('hotelId')) {
      return json(route, [])
    }
    if (path === '/api/admin/hotels/1/status' && method === 'PATCH') {
      const body = readBody(request)
      onAuditStatusUpdate?.(body)
      return json(route, { success: true })
    }

    return json(route, {})
  })
}
