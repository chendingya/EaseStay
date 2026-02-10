const request = require('supertest')

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

jest.mock('../src/config/supabase', () => ({
  from: () => ({
    select: () => Promise.resolve({
      data: [
        { status: 'pending' },
        { status: 'approved' },
        { status: 'approved' },
        { status: 'offline' }
      ],
      error: null
    })
  })
}))

const app = require('../src/app')

describe('GET /status', () => {
  it('returns html status page', async () => {
    const res = await request(app).get('/status')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.text).toContain('易宿平台状态页')
    expect(res.text).toContain('已上架')
  })
})
