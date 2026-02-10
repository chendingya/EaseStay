const request = require('supertest')

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

jest.mock('../src/services/presetService', () => ({
  getAllPresets: jest.fn(),
  getPresetFacilities: jest.fn(),
  getPresetRoomTypes: jest.fn(),
  getPresetPromotionTypes: jest.fn(),
  getHotCities: jest.fn(),
  getAllCities: jest.fn(),
  addPresetFacility: jest.fn(),
  addPresetRoomType: jest.fn(),
  addPresetPromotionType: jest.fn(),
  addPresetCity: jest.fn()
}))

const presetService = require('../src/services/presetService')
const app = require('../src/app')

describe('preset routes', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('GET /api/presets returns merged presets', async () => {
    presetService.getAllPresets.mockResolvedValue({ facilities: [], roomTypes: [] })
    const res = await request(app).get('/api/presets')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.facilities).toBeDefined()
  })

  it('GET /api/presets/facilities returns facilities', async () => {
    presetService.getPresetFacilities.mockResolvedValue([{ id: 1, name: '泳池' }])
    const res = await request(app).get('/api/presets/facilities')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('GET /api/presets/room-types returns room types', async () => {
    presetService.getPresetRoomTypes.mockResolvedValue([{ id: 1, name: '标准间' }])
    const res = await request(app).get('/api/presets/room-types')
    expect(res.status).toBe(200)
    expect(res.body.data[0].name).toBe('标准间')
  })

  it('GET /api/presets/promotion-types returns promotion types', async () => {
    presetService.getPresetPromotionTypes.mockResolvedValue([{ id: 1, type: 'discount' }])
    const res = await request(app).get('/api/presets/promotion-types')
    expect(res.status).toBe(200)
    expect(res.body.data[0].type).toBe('discount')
  })

  it('GET /api/presets/cities/hot returns hot cities', async () => {
    presetService.getHotCities.mockResolvedValue([{ id: 1, name: '上海' }])
    const res = await request(app).get('/api/presets/cities/hot')
    expect(res.status).toBe(200)
    expect(res.body.data[0].name).toBe('上海')
  })

  it('GET /api/presets/cities returns cities', async () => {
    presetService.getAllCities.mockResolvedValue([{ id: 2, name: '北京' }])
    const res = await request(app).get('/api/presets/cities')
    expect(res.status).toBe(200)
    expect(res.body.data[0].name).toBe('北京')
  })
})
