import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RequestAudit from '../../src/pages/RequestAudit.jsx'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('../../src/services', () => ({
  api: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args)
  }
}))

vi.mock('../../src/components', async () => {
  const actual = await vi.importActual('../../src/components')
  return {
    ...actual,
    glassMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  }
})

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  window.getComputedStyle = () => ({
    getPropertyValue: () => ''
  })
})

afterEach(() => {
  mockGet.mockReset()
  mockPut.mockReset()
})

describe('RequestAudit page', () => {
  it('renders title and tabs', async () => {
    mockGet.mockResolvedValueOnce([])
    render(
      <MemoryRouter initialEntries={['/requests']}>
        <RequestAudit />
      </MemoryRouter>
    )
    expect(await screen.findByText('申请审核')).toBeTruthy()
    expect(screen.getByText('全部申请')).toBeTruthy()
    expect(screen.getByText('设施申请')).toBeTruthy()
    expect(screen.getByText('房型申请')).toBeTruthy()
    expect(screen.getByText('优惠申请')).toBeTruthy()
    expect(screen.getByText('删除酒店申请')).toBeTruthy()
    expect(mockGet).toHaveBeenCalledWith('/api/admin/requests')
  })

  it('renders hotel filter actions when hotelId is present', async () => {
    mockGet.mockResolvedValueOnce([])
    render(
      <MemoryRouter initialEntries={['/requests?hotelId=12']}>
        <RequestAudit />
      </MemoryRouter>
    )
    expect(await screen.findByText('返回酒店审核')).toBeTruthy()
    expect(screen.getByText('查看全部申请')).toBeTruthy()
    expect(mockGet).toHaveBeenCalledWith('/api/admin/requests?hotelId=12')
  })
})
