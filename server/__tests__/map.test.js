const request = require('supertest')

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

const app = require('../src/app')

describe('GET /api/map/search', () => {
  it('returns 400 when keywords missing', async () => {
    const res = await request(app).get('/api/map/search')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns mock results when no api key', async () => {
    const res = await request(app).get('/api/map/search?keywords=上海')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.length).toBe(3)
  })
})

describe('GET /api/map/geocode', () => {
  it('returns 400 when address missing', async () => {
    const res = await request(app).get('/api/map/geocode')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns mock geocode when no api key', async () => {
    const res = await request(app).get('/api/map/geocode?address=上海浦东新区')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.formatted_address).toBe('上海浦东新区')
  })
})

describe('GET /api/map/regeocode', () => {
  it('returns 400 when location missing', async () => {
    const res = await request(app).get('/api/map/regeocode')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns mock regeocode when no api key', async () => {
    const res = await request(app).get('/api/map/regeocode?location=121.47,31.23')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.formatted_address).toBe('上海市浦东新区')
  })
})
