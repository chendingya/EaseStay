import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { changeLanguage, initI18n, loadNamespaces } from '../src/locales'

beforeAll(async () => {
  await initI18n()
  await changeLanguage('zh-CN')
  await loadNamespaces(['login', 'requestAudit'])

  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
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

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] }
    }
  }

  if (!window.getComputedStyle) {
    window.getComputedStyle = () => ({
      getPropertyValue: () => ''
    })
  }

  if (!window.scrollTo) {
    window.scrollTo = () => {}
  }
})

afterEach(() => {
  cleanup()
})
