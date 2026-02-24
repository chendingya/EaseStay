import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCommon from './zh-CN/common.json'
import zhAuth from './zh-CN/auth.json'
import zhMenu from './zh-CN/menu.json'
import zhRoute from './zh-CN/route.json'
import zhHeader from './zh-CN/header.json'
import zhRole from './zh-CN/role.json'
import zhStatus from './zh-CN/status.json'
import zhError from './zh-CN/error.json'
import zhBrand from './zh-CN/brand.json'
import enCommon from './en-US/common.json'
import enAuth from './en-US/auth.json'
import enMenu from './en-US/menu.json'
import enRoute from './en-US/route.json'
import enHeader from './en-US/header.json'
import enRole from './en-US/role.json'
import enStatus from './en-US/status.json'
import enError from './en-US/error.json'
import enBrand from './en-US/brand.json'

const fallbackLng = 'zh-CN'
const supportedLngs = ['zh-CN', 'en-US']
const baseNamespaces = ['common', 'auth', 'menu', 'route', 'header', 'role', 'status', 'error', 'brand']
const unwrapLocaleModule = (mod) => mod?.default ?? mod ?? {}
const staticBaseResources = {
  'zh-CN': {
    common: zhCommon,
    auth: zhAuth,
    menu: zhMenu,
    route: zhRoute,
    header: zhHeader,
    role: zhRole,
    status: zhStatus,
    error: zhError,
    brand: zhBrand
  },
  'en-US': {
    common: enCommon,
    auth: enAuth,
    menu: enMenu,
    route: enRoute,
    header: enHeader,
    role: enRole,
    status: enStatus,
    error: enError,
    brand: enBrand
  }
}

const namespaceLoaders = {
  'zh-CN': {
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
const loadingNamespacesByLanguage = new Map()

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
  if (!loadingNamespacesByLanguage.has(normalized)) {
    loadingNamespacesByLanguage.set(normalized, new Map())
  }

  return normalized
}

async function ensureNamespaceLoaded(lng, namespace) {
  const normalized = await ensureLanguageLoaded(lng)
  const loadedNamespaces = loadedNamespacesByLanguage.get(normalized)
  const loadingNamespaces = loadingNamespacesByLanguage.get(normalized)
  const shouldForceReloadInDev = import.meta.env.VITE_I18N_FORCE_RELOAD === 'true'
  const staticResource = staticBaseResources[normalized]?.[namespace]

  if (staticResource) {
    i18n.addResourceBundle(normalized, 'translation', staticResource, true, true)
    loadedNamespaces.add(namespace)
    return normalized
  }

  if (!shouldForceReloadInDev && loadedNamespaces.has(namespace)) return normalized

  const inflight = loadingNamespaces.get(namespace)
  if (inflight) {
    await inflight
    return normalized
  }

  const loader = namespaceLoaders[normalized]?.[namespace]
  if (!loader) return normalized

  const task = (async () => {
    const mod = await loader()
    i18n.addResourceBundle(normalized, 'translation', unwrapLocaleModule(mod), true, true)
    loadedNamespaces.add(namespace)
  })()
  loadingNamespaces.set(namespace, task)
  try {
    await task
  } finally {
    loadingNamespaces.delete(namespace)
  }

  return normalized
}

async function ensureNamespacesLoaded(lng, namespaces = []) {
  const normalized = await ensureLanguageLoaded(lng)
  const targetNamespaces = new Set([...baseNamespaces, ...namespaces])

  await Promise.all(
    Array.from(targetNamespaces).map((namespace) => ensureNamespaceLoaded(normalized, namespace))
  )

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

export function hasLoadedNamespaces(namespaces = []) {
  const activeLng = normalizeLanguage(i18n.resolvedLanguage || i18n.language || fallbackLng)
  const loaded = loadedNamespacesByLanguage.get(activeLng)
  if (!loaded) return false

  const targetNamespaces = new Set([...baseNamespaces, ...namespaces])
  return Array.from(targetNamespaces).every((namespace) => loaded.has(namespace))
}

export async function initI18n(initialNamespaces = []) {
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
  await ensureNamespacesLoaded(initialLng, initialNamespaces)
  await i18n.changeLanguage(initialLng)

  return i18n
}

export default i18n
