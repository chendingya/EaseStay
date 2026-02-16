# 易宿酒店管理平台 - 设计原则

## 1. 页面布局原则

### 1.1 层级控制
- **最多三层嵌套**：页面内容区 → 主要内容容器 → 具体元素
- 避免 Card 嵌套 Card，减少视觉层级堆叠
- 移动端列表支持分步入场，避免大列表突兀出现

### 1.2 导航规范
- **全局面包屑导航**：在 App.jsx 中统一处理，页面组件无需单独实现
- 面包屑始终以「首页」开头，便于用户定位
- 当前页面高亮显示（蓝色加粗），父级链接可点击（灰色）

### 1.3 路由配置
在 App.jsx 中维护 `routeConfig`：
```jsx
const routeConfig = {
  '/': { title: '工作台', icon: <HomeOutlined /> },
  '/hotels': { title: '酒店管理', icon: <SettingOutlined /> },
  '/hotels/new': { title: '新增酒店', parent: '/hotels' },
  '/hotels/edit/:id': { title: '编辑酒店', parent: '/hotels' },
  '/hotels/:id': { title: '酒店详情', parent: '/hotels' },
  '/audit': { title: '审核列表', icon: <SettingOutlined /> }
}
```

### 1.4 页面头部结构
```
[面包屑导航 - 首页 / 父级 / 当前页面（高亮）]
页面标题 + 状态标签 | 操作按钮（右对齐）
```
- 移动端顶部栏：随滚动切换透明/不透明，返回按钮统一样式

## 2. 卡片使用规范

### 2.1 普通卡片适用场景
- **列表页面**：作为主容器（如酒店列表、审核列表）
- **详情页面**：用于分隔不同信息模块（如基本信息、房型信息、设施服务）
- 使用轻微悬浮效果
- hover 阴影：`0 2px 8px rgba(0, 0, 0, 0.08)`

### 2.2 表单页面
- **不使用多个 Card 包裹**
- 使用 `Typography.Title` + `Divider` 分隔内容区块
- 保持表单扁平化，减少视觉层级

### 2.3 玻璃卡片（GlassCard）
- **仅用于预览效果**展示区域
- 苹果风格：半透明 + 模糊效果
- 适用于需要视觉区分的展示型内容

### 2.4 总结
| 页面类型 | 卡片使用 |
|---------|---------|
| 列表页 | ✅ 单个主容器卡片 |
| 详情页 | ✅ 多个卡片分隔模块 |
| 表单/编辑页 | ❌ 不用卡片，用 Title + Divider |
| 预览区域 | ✅ 使用 GlassCard |

## 2.5 玻璃按钮（GlassButton）
- 移动端关键操作按钮统一使用透明玻璃风格
- 适用场景：收藏操作、订单取消/确认、退出登录、预订房型
- 视觉要素：半透明底、轻描边、轻阴影与模糊
- 颜色语义：primary 用于确认操作，danger 用于取消/退出
- 填充层级：outline 为轻色阶，solid 为强调色阶
- 尺寸层级：small 用于次要操作，middle/large 用于确认操作
- 加载态：显示旋转指示与“正在加载”

## 3. 消息提示规范

### 3.1 玻璃消息（glassMessage）
- 所有操作反馈统一使用 `glassMessage`
- 苹果风格圆角消息，带图标
- 类型：success / error / warning / info

### 3.2 使用方式
```jsx
import { glassMessage as message } from '../components/GlassUI'

message.success('操作成功')
message.error('操作失败')
```

## 4. 表单布局规范

### 4.1 基础布局
- 使用 `layout="vertical"` 垂直布局
- 双列布局使用 `Row` + `Col span={12}`
- 单列长输入框使用 `Col span={24}`

### 4.2 动态列表（Form.List）
- 第一行显示列标签（label）
- 后续行隐藏标签，保持对齐
- 使用 `align="bottom"` 对齐删除按钮
```jsx
label={index === 0 ? "标签名" : undefined}
```

## 5. 颜色规范

### 5.1 状态颜色
| 状态 | 颜色 | 用途 |
|------|------|------|
| pending | orange | 待审核 |
| approved | green | 已上架 |
| rejected | red | 已驳回 |
| offline | default | 已下线 |

### 5.2 强调颜色
- 价格：`#f5222d`（红色）
- 星级：`#faad14`（金色）
- 设施标签：`blue`
- 优惠标签：`orange`

## 6. 组件封装

### 6.1 已封装组件
位置：`admin/src/components/`

| 组件 | 文件 | 用途 |
|------|------|------|
| GlassCard | GlassUI.jsx | 玻璃风格卡片 |
| glassMessage | GlassUI.jsx | 玻璃风格消息提示 |
| TableFilterBar | TableFilterBar.jsx | 列表搜索/筛选/重置/刷新工具条 |

### 6.2 使用示例
```jsx
import { GlassCard, glassMessage as message } from '../components/GlassUI'

// 玻璃卡片
<GlassCard title="标题">内容</GlassCard>

// 消息提示
message.success('成功')
```

## 7. 响应式原则

### 7.1 栅格系统
- 主内容区：`Col span={16}`
- 侧边信息：`Col span={8}`
- 间距：`gutter={24}`

### 7.2 表格
- 长列表默认使用服务端分页：`pagination.current/pageSize/total` 由接口返回驱动
- 搜索和筛选默认走服务端参数，不在页面内对全量数据做二次过滤
- 无分页场景：`pagination={false}`

### 7.3 长列表性能规范（Admin）
- 查询约定：
  - 分页：`page/pageSize`
  - 筛选：`keyword/status/city/type/hotelId`（按页面选用）
- 状态联动：
  - 搜索词变化后回到第一页（防抖触发）
  - 任何筛选项变化后回到第一页
  - 刷新操作仅重拉当前分页与筛选条件下的数据
- 复用约定：
  - 页面优先复用 `useRemoteTableQuery` 处理查询状态
  - 页面优先复用 `TableFilterBar` 组织筛选区结构
- 兼容约定：
  - 服务端接口需保持“无分页参数兼容旧结构，有分页参数返回分页结构”

## 8. API 请求规范

### 8.1 统一请求入口
- 前端请求统一使用 `admin/src/services/request.js` 的 api 实例
- 业务页面不得直接使用 `fetch`

### 8.2 认证与错误处理
- Token 由请求拦截器统一注入
- 响应错误由统一拦截器与页面级处理协作完成

### 8.3 国际化规范
- 统一使用 `react-i18next` 的 `useTranslation` 获取 `t`，不要在组件内条件调用 Hook
- 页面文案不得硬编码，统一使用 `t('模块.子模块.字段')` 形式
- 新增文案必须同时补齐 `admin/src/locales/zh-CN/*.json` 与 `admin/src/locales/en-US/*.json` 对应 namespace 文件
- 使用插值完成动态文案，不拼接字符串或把单位写在代码里
- 文案 key 以页面/功能域为前缀，保持层级清晰与可检索
- 语言切换由全局组件处理，页面内不自行维护语言状态
- 词典按业务域拆分 namespace，禁止把所有文案堆到单个巨型 `translation.json`
- 路由必须声明 namespace 依赖并按需加载，避免全量词典首屏注入

### 8.4 国际化门禁规范（CI）
- PR 必过：`npm run i18n:check`（双语 key 一致性）
- 主分支必过：`npm run i18n:check:strict`（包含硬编码中文扫描）
- 对硬编码治理采用“先增量阻断，后存量清理”策略

示例：
```jsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()

<Typography.Title level={4}>{t('dashboard.overview.title')}</Typography.Title>
<Typography.Text>{t('hotels.total', { count })}</Typography.Text>
```

## 9. 统计与批量操作规范

## 10. 移动端交互反馈
- 下拉刷新需提供临界反馈
- 按钮加载态需避免重复提交

### 9.1 批量折扣
- 仅选择房型、数量与折扣力度，无需优惠名称
- 房型选择前展示可用统计（已用/空闲）

### 9.2 批量房型操作
- 展示已用与空闲房间数
- 支持按房型下架数量或调整库存

### 9.3 商户酒店详情
- 房间总览展示总数、已用、空闲、下架与占比
- 订单展示与统计分区明确，分页与统计表独立呈现

### 9.4 商户总览
- 统计商户名下酒店总数与月度收入

## 10. 数据库变更原则

### 10.1 脚本分段
- 每次修改表结构时，必须标注原始表结构
- 用注释区分增量执行区块与从零执行区块

### 10.2 增量优先
- 已有数据场景必须使用增量 SQL（ALTER TABLE / IF NOT EXISTS）
- 禁止直接重建表导致数据丢失
- 更新旧表用的sql写在文件末尾

#### 示例：房型字段增量变更（写在 schema.sql 文件末尾）

## 11. 错误处理原则

### 10.1 异步请求
- 异步请求必须捕获错误并记录日志，避免空的 catch 块
- 影响用户操作结果的失败需要给出可理解的提示（使用 glassMessage）
- 页面级 catch 只处理本地状态与必要提示，通用错误由统一请求层负责

## 12. 最近更新（2026-02-16）
- Admin 国际化已切换为 namespace 分层 + 路由级懒加载
- 国际化校验脚本升级为多 namespace 合并检查
- CI 双门禁落地：一致性检查与严格检查分级执行
- 管理员酒店详情页对齐商户端功能（Tabs、房型总览、订单展示与统计）
- 扩展管理员 API 端点以支持无商户 ID 限制的数据访问
- 统一使用 GlassUI 组件保持视觉一致性
- 管理端长列表统一切换到服务端分页/筛选，沉淀 `useRemoteTableQuery + TableFilterBar` 复用范式

## 13. 禁止事项

❌ 不要在页面内嵌套超过三层容器  
❌ 不要在页面组件中单独写面包屑，由 App.jsx 统一处理  
❌ 不要使用"返回"按钮代替面包屑  
❌ 不要在表单/编辑页面使用多个 Card 包裹（详情页可以用）  
❌ 不要给普通内容卡片添加透明/模糊效果  
❌ 不要使用 antd 原生 message，统一使用 glassMessage  
❌ 不要保留空的 catch 块  
❌ 不要在页面中直接使用 fetch  
