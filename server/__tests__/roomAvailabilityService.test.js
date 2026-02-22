jest.mock('../src/config/supabase', () => ({
  from: jest.fn()
}))

const supabase = require('../src/config/supabase')
const { getActiveOrderQtyMap } = require('../src/services/roomAvailabilityService')

const createQuery = ({ data = [], error = null } = {}) => ({
  data,
  error,
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis()
})

describe('roomAvailabilityService.getActiveOrderQtyMap', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('counts pending/confirmed/finished orders as occupying stock', async () => {
    const query = createQuery({
      data: [
        { room_type_id: 1, quantity: 1 },
        { room_type_id: 1, quantity: '2' },
        { room_type_id: 2, quantity: 3 }
      ]
    })
    supabase.from.mockReturnValue(query)

    const result = await getActiveOrderQtyMap({ roomTypeIds: [1, 2], asOfDate: new Date(2026, 1, 10) })

    expect(result.ok).toBe(true)
    expect(query.in).toHaveBeenNthCalledWith(1, 'room_type_id', [1, 2])
    expect(query.in).toHaveBeenNthCalledWith(2, 'status', ['pending_payment', 'confirmed', 'finished'])
    expect(result.map.get(1)).toBe(3)
    expect(result.map.get(2)).toBe(3)
  })

  it('uses check_out > asOfDate for real-time occupancy checks', async () => {
    const query = createQuery()
    supabase.from.mockReturnValue(query)

    await getActiveOrderQtyMap({ roomTypeIds: [10], asOfDate: new Date(2026, 1, 10) })

    expect(query.gt).toHaveBeenCalledWith('check_out', '2026-02-10')
    expect(query.lt).not.toHaveBeenCalled()
  })

  it('uses overlap window when checkIn/checkOut are provided', async () => {
    const query = createQuery()
    supabase.from.mockReturnValue(query)

    await getActiveOrderQtyMap({
      roomTypeIds: [11],
      checkIn: '2026-03-10',
      checkOut: '2026-03-12'
    })

    expect(query.lt).toHaveBeenCalledWith('check_in', '2026-03-12')
    expect(query.gt).toHaveBeenCalledWith('check_out', '2026-03-10')
  })
})
