const request = require('supertest')
const { signToken } = require('../src/middleware/auth')

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

jest.mock('../src/services/requestService', () => ({
  createRequest: jest.fn(),
  getMerchantRequests: jest.fn(),
  getPendingRequests: jest.fn(),
  getAdminPendingSummary: jest.fn()
}))

const requestService = require('../src/services/requestService')
const app = require('../src/app')

describe('request routes', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('POST /api/requests creates request for merchant', async () => {
    requestService.createRequest.mockResolvedValue({ ok: true, status: 201, data: { id: 11 } })
    const token = signToken({ id: 5, role: 'merchant' })
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'facility', name: '泳池' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(11)
  })

  it('GET /api/requests returns merchant list', async () => {
    requestService.getMerchantRequests.mockResolvedValue({ ok: true, status: 200, data: [{ id: 1 }] })
    const token = signToken({ id: 6, role: 'merchant' })
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
  })

  it('GET /api/admin/requests/summary returns summary for admin', async () => {
    requestService.getAdminPendingSummary.mockResolvedValue({
      ok: true,
      status: 200,
      data: { pendingHotels: 1, pendingRequests: 2 }
    })
    const token = signToken({ id: 1, role: 'admin' })
    const res = await request(app)
      .get('/api/admin/requests/summary')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.pendingRequests).toBe(2)
  })
})
