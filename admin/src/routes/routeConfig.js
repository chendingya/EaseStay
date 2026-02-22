export const routeConfig = {
  '/login': { titleKey: 'auth.login', namespaces: ['login'] },
  '/': { titleKey: 'route.dashboard', namespaces: ['dashboard'] },
  '/hotels': { titleKey: 'route.myHotels', namespaces: ['hotels'] },
  '/hotels/new': { titleKey: 'route.newHotel', parent: '/hotels', namespaces: ['hotelEdit'] },
  '/hotels/edit/:id': { titleKey: 'route.editHotel', parent: '/hotels', namespaces: ['hotelEdit'] },
  '/hotels/:id': { titleKey: 'route.hotelDetail', parent: '/hotels', namespaces: ['hotelDetail'] },
  '/hotels/:id/stats': { titleKey: 'route.orderStats', parent: '/hotels/:id', namespaces: ['orderStats'] },
  '/admin-hotels': { titleKey: 'route.hotels', namespaces: ['adminHotels'] },
  '/admin-hotels/:id': { titleKey: 'route.hotelDetail', parent: '/admin-hotels', namespaces: ['adminHotelDetail'] },
  '/admin-hotels/:id/stats': { titleKey: 'route.orderStats', parent: '/admin-hotels/:id', namespaces: ['orderStats'] },
  '/audit': { titleKey: 'route.hotelAudit', namespaces: ['audit'] },
  '/audit/:id': { titleKey: 'route.auditDetail', parent: '/audit', namespaces: ['auditDetail'] },
  '/requests': { titleKey: 'route.requestAudit', namespaces: ['requestAudit'] },
  '/messages': { titleKey: 'route.messages', namespaces: ['messages'] },
  '/account': { titleKey: 'route.account', namespaces: ['account'] },
  '/merchants': { titleKey: 'route.merchants', namespaces: ['merchants'] },
  '/merchants/:id': { titleKey: 'route.merchantDetail', parent: '/merchants', namespaces: ['merchants', 'merchantDetail'] }
}

const routeMatchers = [
  { pattern: /^\/login$/, key: '/login' },
  { pattern: /^\/hotels\/new$/, key: '/hotels/new' },
  { pattern: /^\/hotels\/edit\/\d+$/, key: '/hotels/edit/:id' },
  { pattern: /^\/hotels\/\d+\/stats$/, key: '/hotels/:id/stats' },
  { pattern: /^\/hotels\/\d+$/, key: '/hotels/:id' },
  { pattern: /^\/admin-hotels$/, key: '/admin-hotels' },
  { pattern: /^\/admin-hotels\/\d+\/stats$/, key: '/admin-hotels/:id/stats' },
  { pattern: /^\/admin-hotels\/\d+$/, key: '/admin-hotels/:id' },
  { pattern: /^\/audit\/\d+$/, key: '/audit/:id' },
  { pattern: /^\/requests$/, key: '/requests' },
  { pattern: /^\/messages$/, key: '/messages' },
  { pattern: /^\/account$/, key: '/account' },
  { pattern: /^\/merchants$/, key: '/merchants' },
  { pattern: /^\/merchants\/\d+$/, key: '/merchants/:id' },
  { pattern: /^\/$/, key: '/' },
  { pattern: /^\/hotels$/, key: '/hotels' },
  { pattern: /^\/audit$/, key: '/audit' }
]

export function getRouteNamespaces(pathname) {
  const matched = routeMatchers.find((item) => item.pattern.test(pathname))
  if (!matched) return []

  return routeConfig[matched.key]?.namespaces || []
}
