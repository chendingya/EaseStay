import { HomeOutlined, SettingOutlined, UserOutlined, TeamOutlined, BellOutlined, FileSearchOutlined, ShopOutlined } from '@ant-design/icons'

export const routeConfig = {
  '/': { title: '工作台', icon: HomeOutlined },
  '/hotels': { title: '我的酒店', icon: SettingOutlined },
  '/hotels/new': { title: '新增酒店', parent: '/hotels' },
  '/hotels/edit/:id': { title: '编辑酒店', parent: '/hotels' },
  '/hotels/:id': { title: '酒店详情', parent: '/hotels' },
  '/hotels/:id/stats': { title: '订单统计', parent: '/hotels/:id' },
  '/admin-hotels': { title: '酒店管理', icon: ShopOutlined },
  '/admin-hotels/:id': { title: '酒店详情', parent: '/admin-hotels' },
  '/admin-hotels/:id/stats': { title: '订单统计', parent: '/admin-hotels/:id' },
  '/audit': { title: '酒店审核', icon: SettingOutlined },
  '/audit/:id': { title: '审核详情', parent: '/audit' },
  '/requests': { title: '申请审核', icon: FileSearchOutlined },
  '/messages': { title: '消息中心', icon: BellOutlined },
  '/account': { title: '账户管理', icon: UserOutlined },
  '/merchants': { title: '商户管理', icon: TeamOutlined },
  '/merchants/:id': { title: '商户详情', parent: '/merchants' }
}
