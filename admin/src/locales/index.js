import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const fallbackLng = 'zh-CN'
const supportedLngs = ['zh-CN', 'en-US']
const baseNamespaces = ['common', 'auth', 'menu', 'route', 'header', 'role', 'status', 'error', 'brand']

const namespaceLoaders = {
  'zh-CN': {
    common: () => import('./zh-CN/common.json'),
    auth: () => import('./zh-CN/auth.json'),
    menu: () => import('./zh-CN/menu.json'),
    route: () => import('./zh-CN/route.json'),
    header: () => import('./zh-CN/header.json'),
    role: () => import('./zh-CN/role.json'),
    status: () => import('./zh-CN/status.json'),
    error: () => import('./zh-CN/error.json'),
    brand: () => import('./zh-CN/brand.json'),
    hotels: () => import('./zh-CN/hotels.json'),
    hotelDetail: () => import('./zh-CN/hotelDetail.json'),
    login: () => import('./zh-CN/login.json'),
    account: () => import('./zh-CN/account.json'),
    messages: () => import('./zh-CN/messages.json'),
    dashboard: () => import('./zh-CN/dashboard.json'),
    orderStats: () => import('./zh-CN/orderStats.json'),
    hotelEdit: () => import('./zh-CN/hotelEdit.json')
  },
  'en-US': {
    common: () => import('./en-US/common.json'),
    auth: () => import('./en-US/auth.json'),
    menu: () => import('./en-US/menu.json'),
    route: () => import('./en-US/route.json'),
    header: () => import('./en-US/header.json'),
    role: () => import('./en-US/role.json'),
    status: () => import('./en-US/status.json'),
    error: () => import('./en-US/error.json'),
    brand: () => import('./en-US/brand.json'),
    hotels: () => import('./en-US/hotels.json'),
    hotelDetail: () => import('./en-US/hotelDetail.json'),
    login: () => import('./en-US/login.json'),
    account: () => import('./en-US/account.json'),
    messages: () => import('./en-US/messages.json'),
    dashboard: () => import('./en-US/dashboard.json'),
    orderStats: () => import('./en-US/orderStats.json'),
    hotelEdit: () => import('./en-US/hotelEdit.json')
  }
}

const loadedNamespacesByLanguage = new Map()
const rawChangeLanguage = i18n.changeLanguage.bind(i18n)

function normalizeLanguage(lng) {
  if (!lng) return fallbackLng
  if (supportedLngs.includes(lng)) return lng
  if (lng.startsWith('zh')) return 'zh-CN'
  if (lng.startsWith('en')) return 'en-US'
  return fallbackLng
}

async function ensureLanguageLoaded(lng) {
  const normalized = normalizeLanguage(lng)

  if (!loadedNamespacesByLanguage.has(normalized)) {
    loadedNamespacesByLanguage.set(normalized, new Set())
  }

  return normalized
}

async function ensureNamespaceLoaded(lng, namespace) {
  const normalized = await ensureLanguageLoaded(lng)
  const loadedNamespaces = loadedNamespacesByLanguage.get(normalized)

  if (loadedNamespaces.has(namespace)) return normalized

  const loader = namespaceLoaders[normalized]?.[namespace]
  if (!loader) return normalized

  const mod = await loader()
  i18n.addResourceBundle(normalized, 'translation', mod.default ?? mod, true, true)
  loadedNamespaces.add(namespace)

  return normalized
}

async function ensureNamespacesLoaded(lng, namespaces = []) {
  const normalized = await ensureLanguageLoaded(lng)
  const targetNamespaces = new Set([...baseNamespaces, ...namespaces])

  for (const namespace of targetNamespaces) {
    await ensureNamespaceLoaded(normalized, namespace)
  }

  return normalized
}

i18n.changeLanguage = async (lng, ...args) => {
  const normalized = await ensureNamespacesLoaded(lng)
  return rawChangeLanguage(normalized, ...args)
}

export async function loadNamespaces(namespaces = []) {
  const activeLng = normalizeLanguage(i18n.resolvedLanguage || i18n.language || fallbackLng)
  await ensureNamespacesLoaded(activeLng, namespaces)
}

export async function initI18n() {
  if (!i18n.isInitialized) {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {},
        fallbackLng,
        supportedLngs,
        nonExplicitSupportedLngs: true,
        load: 'currentOnly',
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage']
        },
        interpolation: {
          escapeValue: false
        },
        react: {
          useSuspense: false
        }
      })
  }

  const initialLng = normalizeLanguage(i18n.resolvedLanguage || i18n.language || fallbackLng)
  await ensureNamespacesLoaded(initialLng)
  await rawChangeLanguage(initialLng)

  return i18n
}

export default i18n
