import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import Login from '../../src/pages/Login.jsx'

vi.mock('../../src/services', () => ({
  api: {
    post: vi.fn()
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
})

describe('Login page', () => {
  it('renders tabs and title', () => {
    render(<Login onLoggedIn={vi.fn()} />)
    expect(screen.getByText('易宿酒店平台')).toBeTruthy()
    expect(screen.getAllByText('登录').length).toBeGreaterThan(0)
    expect(screen.getAllByText('注册').length).toBeGreaterThan(0)
  })
})
