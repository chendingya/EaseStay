process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

const presetService = require('../src/services/presetService')
const presetController = require('../src/controllers/presetController')

jest.mock('../src/services/presetService')

const createRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('presetController', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('getAllPresets returns data', async () => {
    const res = createRes()
    presetService.getAllPresets.mockResolvedValue({ facilities: [], roomTypes: [] })
    await presetController.getAllPresets({}, res)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { facilities: [], roomTypes: [] } })
  })

  it('getFacilities handles errors', async () => {
    const res = createRes()
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    presetService.getPresetFacilities.mockRejectedValue(new Error('fail'))
    await presetController.getFacilities({}, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: '获取设施列表失败' })
    errorSpy.mockRestore()
  })

  it('addFacility validates name', async () => {
    const res = createRes()
    await presetController.addFacility({ body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: '设施名称不能为空' })
  })

  it('addRoomType validates required fields', async () => {
    const res = createRes()
    await presetController.addRoomType({ body: { name: '标准间' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: '房型名称和价格不能为空' })
  })

  it('addPromotionType validates required fields', async () => {
    const res = createRes()
    await presetController.addPromotionType({ body: { type: 'discount' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: '优惠类型和标签不能为空' })
  })

  it('addCity validates name', async () => {
    const res = createRes()
    await presetController.addCity({ body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: '城市名称不能为空' })
  })
})
