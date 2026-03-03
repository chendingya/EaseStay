process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
  rpc: jest.fn()
}))

jest.mock('../src/services/roomAvailabilityService', () => ({
  formatDateOnly: jest.fn((value) => String(value)),
  getActiveOrderQtyMap: jest.fn(),
  computeRoomAvailability: jest.fn(({ stock, used, isActive }) => ({
    available: isActive ? Math.max(Number(stock || 0) - Number(used || 0), 0) : 0,
    offline: 0
  })),
  roundToTwo: jest.fn((value) => Math.round(Number(value || 0) * 100) / 100)
}))

const supabase = require('../src/config/supabase')
const roomAvailabilityService = require('../src/services/roomAvailabilityService')
const { createPublicOrder } = require('../src/services/hotelService')

const createSingleQuery = (result) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(result)
})

describe('hotelService.createPublicOrder concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    roomAvailabilityService.getActiveOrderQtyMap.mockResolvedValue({
      ok: true,
      map: new Map()
    })

    const hotelQuery = createSingleQuery({
      data: {
        id: 1,
        merchant_id: 2,
        status: 'approved',
        name: '并发测试酒店',
        name_en: 'Concurrent Test Hotel',
        promotions: []
      },
      error: null
    })

    const roomQuery = createSingleQuery({
      data: {
        id: 10,
        hotel_id: 1,
        name: '标准大床房',
        stock: 1,
        is_active: true,
        price: 199,
        discount_rate: null,
        discount_quota: 0,
        discount_periods: []
      },
      error: null
    })

    supabase.from.mockImplementation((table) => {
      if (table === 'hotels') return hotelQuery
      if (table === 'room_types') return roomQuery
      throw new Error('unexpected table: ' + table)
    })
  })

  it('allows only one success when two orders race for one remaining room', async () => {
    let remaining = 1
    let nextId = 1000

    supabase.rpc.mockImplementation(async (fnName, args) => {
      expect(fnName).toBe('create_order_atomic')
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (remaining >= args.p_quantity) {
        remaining -= args.p_quantity
        return {
          data: {
            ok: true,
            code: 'OK',
            order: {
              id: nextId++,
              order_no: args.p_order_no,
              status: 'pending_payment',
              room_type_id: args.p_room_type_id,
              quantity: args.p_quantity
            }
          },
          error: null
        }
      }
      return {
        data: {
          ok: false,
          code: 'INSUFFICIENT_STOCK',
          message: '房型库存不足'
        },
        error: null
      }
    })

    const payload = {
      roomTypeId: 10,
      quantity: 1,
      checkIn: '2026-03-10',
      checkOut: '2026-03-11'
    }

    const [first, second] = await Promise.all([
      createPublicOrder({ hotelId: 1, userId: 101, payload }),
      createPublicOrder({ hotelId: 1, userId: 102, payload })
    ])

    const results = [first, second]
    const successCount = results.filter((item) => item.ok && item.status === 201).length
    const conflictCount = results.filter((item) => !item.ok && item.status === 409).length

    expect(successCount).toBe(1)
    expect(conflictCount).toBe(1)
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('retries on ORDER_NO_CONFLICT and succeeds on next attempt', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: { ok: false, code: 'ORDER_NO_CONFLICT', message: '订单号冲突，请重试' },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          code: 'OK',
          order: { id: 2001, order_no: 'YS-RETried', status: 'pending_payment' }
        },
        error: null
      })

    const result = await createPublicOrder({
      hotelId: 1,
      userId: 201,
      payload: {
        roomTypeId: 10,
        quantity: 1,
        checkIn: '2026-03-10',
        checkOut: '2026-03-11'
      }
    })

    expect(result.ok).toBe(true)
    expect(result.status).toBe(201)
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })
})
