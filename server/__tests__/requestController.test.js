process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

const requestService = require('../src/services/requestService')
const requestController = require('../src/controllers/requestController')

jest.mock('../src/services/requestService')

const createRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('requestController', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('createRequest returns 201 with data', async () => {
    const res = createRes()
    const req = { user: { id: 9 }, body: { type: 'facility', name: '泳池' } }
    requestService.createRequest.mockResolvedValue({ ok: true, status: 201, data: { id: 1 } })
    await requestController.createRequest(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id: 1 })
  })

  it('getMerchantRequests handles errors', async () => {
    const res = createRes()
    const req = { user: { id: 2 }, query: {} }
    requestService.getMerchantRequests.mockResolvedValue({ ok: false, status: 500, message: 'fail' })
    await requestController.getMerchantRequests(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'fail' })
  })

  it('getAdminPendingSummary returns data', async () => {
    const res = createRes()
    requestService.getAdminPendingSummary.mockResolvedValue({
      ok: true,
      status: 200,
      data: { pendingHotels: 2, pendingRequests: 3 }
    })
    await requestController.getAdminPendingSummary({}, res)
    expect(res.json).toHaveBeenCalledWith({ pendingHotels: 2, pendingRequests: 3 })
  })

  it('reviewRequest uses service result', async () => {
    const res = createRes()
    const req = { params: { id: '12' }, body: { action: 'approve' } }
    requestService.reviewRequest.mockResolvedValue({ ok: true, status: 200, message: 'ok' })
    await requestController.reviewRequest(req, res)
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' })
  })
})
