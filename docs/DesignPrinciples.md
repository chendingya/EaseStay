# 易宿酒店管理平台 - 设计原则

## 1. 页面布局原则

### 1.1 层级控制
- **最多三层嵌套**：页面内容区 → 主要内容容器 → 具体元素
- 避免 Card 嵌套 Card，减少视觉层级堆叠

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
- 使用分页：`pagination={{ pageSize: 8 }}`
- 无分页场景：`pagination={false}`

## 8. API 请求规范

### 8.1 统一请求入口
- 前端请求统一使用 `admin/src/services/request.js` 的 api 实例
- 业务页面不得直接使用 `fetch`

### 8.2 认证与错误处理
- Token 由请求拦截器统一注入
- 响应错误由统一拦截器与页面级处理协作完成

## 9. 统计与批量操作规范

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

## 11. 错误处理原则

### 10.1 异步请求
- 异步请求必须捕获错误并记录日志，避免空的 catch 块
- 影响用户操作结果的失败需要给出可理解的提示（使用 glassMessage）
- 页面级 catch 只处理本地状态与必要提示，通用错误由统一请求层负责

## 12. 最近更新（2026-01-31）
- 管理端 API 请求迁移到统一 axios 实例
- 统一请求层加入认证与错误处理策略
- 明确批量折扣、房型操作与统计展示规范
- 补齐页面与通知服务的错误日志与提示
- 统一处理请求失败后的本地状态回退逻辑
- 清理未使用的导入以通过 lint
- 明确数据库表结构修改的增量执行规范

## 13. 禁止事项

❌ 不要在页面内嵌套超过三层容器  
❌ 不要在页面组件中单独写面包屑，由 App.jsx 统一处理  
❌ 不要使用"返回"按钮代替面包屑  
❌ 不要在表单/编辑页面使用多个 Card 包裹（详情页可以用）  
❌ 不要给普通内容卡片添加透明/模糊效果  
❌ 不要使用 antd 原生 message，统一使用 glassMessage  
❌ 不要保留空的 catch 块  
❌ 不要在页面中直接使用 fetch  
