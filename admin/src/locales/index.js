import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const fallbackLng = 'zh-CN'
const supportedLngs = ['zh-CN', 'en-US']
const baseNamespaces = ['common', 'auth', 'menu', 'route', 'header', 'role', 'status', 'error', 'brand']
const unwrapLocaleModule = (mod) => mod?.default ?? mod ?? {}

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
    hotelEdit: () => import('./zh-CN/hotelEdit.json'),
    audit: () => import('./zh-CN/audit.json'),
    auditDetail: () => import('./zh-CN/auditDetail.json'),
    requestAudit: () => import('./zh-CN/requestAudit.json'),
    merchants: () => import('./zh-CN/merchants.json'),
    merchantDetail: () => import('./zh-CN/merchantDetail.json'),
    adminHotels: () => import('./zh-CN/adminHotels.json'),
    adminHotelDetail: () => import('./zh-CN/adminHotelDetail.json')
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
    hotelEdit: () => import('./en-US/hotelEdit.json'),
    audit: () => import('./en-US/audit.json'),
    auditDetail: () => import('./en-US/auditDetail.json'),
    requestAudit: () => import('./en-US/requestAudit.json'),
    merchants: () => import('./en-US/merchants.json'),
    merchantDetail: () => import('./en-US/merchantDetail.json'),
    adminHotels: () => import('./en-US/adminHotels.json'),
    adminHotelDetail: () => import('./en-US/adminHotelDetail.json')
  }
}

const loadedNamespacesByLanguage = new Map()

function normalizeLanguage(lng) {
  if (!lng) return fallbackLng
  const normalizedInput = String(lng)
  const lower = normalizedInput.toLowerCase()
  if (supportedLngs.includes(normalizedInput)) return normalizedInput
  if (lower === 'zh-cn') return 'zh-CN'
  if (lower === 'en-us') return 'en-US'
  if (lower.startsWith('zh')) return 'zh-CN'
  if (lower.startsWith('en')) return 'en-US'
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
  const shouldForceReloadInDev = import.meta.env.DEV

  if (!shouldForceReloadInDev && loadedNamespaces.has(namespace)) return normalized

  const loader = namespaceLoaders[normalized]?.[namespace]
  if (!loader) return normalized

  const mod = await loader()
  i18n.addResourceBundle(normalized, 'translation', unwrapLocaleModule(mod), true, true)
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

export async function changeLanguage(lng, ...args) {
  const normalized = await ensureNamespacesLoaded(lng)
  return i18n.changeLanguage(normalized, ...args)
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
        ns: ['translation'],
        defaultNS: 'translation',
        fallbackNS: 'translation',
        fallbackLng,
        supportedLngs,
        nonExplicitSupportedLngs: false,
        cleanCode: false,
        lowerCaseLng: false,
        load: 'currentOnly',
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage']
        },
        interpolation: {
          escapeValue: false
        },
        keySeparator: '.',
        nsSeparator: ':',
        ignoreJSONStructure: false,
        react: {
          useSuspense: false
        }
      })
  }

  const initialLng = normalizeLanguage(i18n.resolvedLanguage || i18n.language || fallbackLng)
  await ensureNamespacesLoaded(initialLng)
  await i18n.changeLanguage(initialLng)

  return i18n
}

export default i18n
