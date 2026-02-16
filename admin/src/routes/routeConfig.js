import { HomeOutlined, SettingOutlined, UserOutlined, TeamOutlined, BellOutlined, FileSearchOutlined, ShopOutlined } from '@ant-design/icons'

export const routeConfig = {
  '/': { titleKey: 'route.dashboard', icon: HomeOutlined },
  '/hotels': { titleKey: 'route.myHotels', icon: SettingOutlined },
  '/hotels/new': { titleKey: 'route.newHotel', parent: '/hotels' },
  '/hotels/edit/:id': { titleKey: 'route.editHotel', parent: '/hotels' },
  '/hotels/:id': { titleKey: 'route.hotelDetail', parent: '/hotels' },
  '/hotels/:id/stats': { titleKey: 'route.orderStats', parent: '/hotels/:id' },
  '/admin-hotels': { titleKey: 'route.hotels', icon: ShopOutlined },
  '/admin-hotels/:id': { titleKey: 'route.hotelDetail', parent: '/admin-hotels' },
  '/admin-hotels/:id/stats': { titleKey: 'route.orderStats', parent: '/admin-hotels/:id' },
  '/audit': { titleKey: 'route.hotelAudit', icon: SettingOutlined },
  '/audit/:id': { titleKey: 'route.auditDetail', parent: '/audit' },
  '/requests': { titleKey: 'route.requestAudit', icon: FileSearchOutlined },
  '/messages': { titleKey: 'route.messages', icon: BellOutlined },
  '/account': { titleKey: 'route.account', icon: UserOutlined },
  '/merchants': { titleKey: 'route.merchants', icon: TeamOutlined },
  '/merchants/:id': { titleKey: 'route.merchantDetail', parent: '/merchants' }
}
