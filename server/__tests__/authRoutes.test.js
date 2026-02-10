const request = require('supertest')

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

jest.mock('../src/services/authService', () => ({
  register: jest.fn(),
  login: jest.fn()
}))

jest.mock('../src/services/smsService', () => ({
  sendCode: jest.fn()
}))

const { register, login } = require('../src/services/authService')
const { sendCode } = require('../src/services/smsService')
const app = require('../src/app')

describe('auth routes', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('POST /api/auth/sms/send returns code', async () => {
    sendCode.mockResolvedValue({ ok: true, code: '123456', expiresAt: 123 })
    const res = await request(app).post('/api/auth/sms/send').send({ username: 'u1' })
    expect(res.status).toBe(200)
    expect(res.body.code).toBe('123456')
  })

  it('POST /api/auth/sms/send returns 400 on failure', async () => {
    sendCode.mockResolvedValue({ ok: false, message: 'fail' })
    const res = await request(app).post('/api/auth/sms/send').send({ username: 'u1' })
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('fail')
  })

  it('POST /api/auth/register returns 201', async () => {
    register.mockResolvedValue({ ok: true, status: 201, data: { id: 1 } })
    const res = await request(app).post('/api/auth/register').send({ username: 'u1', password: 'p', role: 'merchant', code: '123456' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(1)
  })

  it('POST /api/auth/login returns 200', async () => {
    login.mockResolvedValue({ ok: true, status: 200, data: { token: 't', userRole: 'admin' } })
    const res = await request(app).post('/api/auth/login').send({ username: 'u1', password: 'p' })
    expect(res.status).toBe(200)
    expect(res.body.userRole).toBe('admin')
  })
})
