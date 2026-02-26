# Admin 国际化实践手册

## 1. 目标与范围
- 目标：把管理端国际化从“可用”升级为“可维护、可扩展、可性能化”。
- 范围：`admin` Web 管理端，语言为 `zh-CN` 与 `en-US`。

## 2. 已落地实践（当前基线）
### 2.1 key-first 约束
- 代码层统一使用 `t('domain.module.key')`。
- 禁止拼接 key（如 `t('hotels.' + type)`）与拼接文案单位（如 `'¥' + price`）。

### 2.2 namespace 词典拆分
- 目录从单文件 `translation.json` 演进为按业务域拆分的多文件结构。
- 当前结构（示例）：
  - `common.json`
  - `auth.json`
  - `menu.json`
  - `route.json`
  - `header.json`
  - `role.json`
  - `status.json`
  - `error.json`
  - `brand.json`
  - `dashboard.json`
  - `hotels.json`
  - `hotelEdit.json`
  - `hotelDetail.json`
  - `orderStats.json`
  - `messages.json`
  - `account.json`
  - `login.json`

### 2.3 语言 + namespace 懒加载
- 语言切换时按 `locale + namespace` 动态加载资源。
- 初始化只加载基础 namespace，页面路由切换时补加载页面 namespace。

### 2.4 路由级按需加载
- 页面组件使用路由级 `React.lazy`。
- 路由元数据声明 `namespaces`，进入路由前先确保词典就绪。

### 2.5 CI 门禁分层
- PR 门禁：`npm run i18n:check`（只校验 key 一致性）。
- 主分支门禁：`npm run i18n:check:strict`（再加硬编码中文扫描）。

### 2.6 占位符与调用参数一致性（2026-02 新增）
- 词典占位符命名必须与调用参数完全一致，例如词典使用 `{{count}}` 时，代码必须传 `{ count: xx }`。
- 禁止“词典用 `count`，代码传 `value`”这类隐式不一致，否则会出现原样 `{{}}` 或空文案。
- 对金额/折扣等高频字段统一约定：
  - 折扣值：`count`
  - 数值金额：`value`

### 2.7 语义分层：标题 key 与模板 key 分离（2026-02 新增）
- 表头、按钮、标签等“纯标题型文案”不得包含占位符。
- 带变量的 key 只用于完整句式模板（如“现价 ¥{{value}}”）。
- 示例：
  - 正确：`room.price = "Price"`，`room.currentPrice = "Current ¥{{value}}"`
  - 错误：`room.price = "Price {{value}}"`（用于表头会导致空值或错位）

### 2.8 多语言布局韧性（2026-02 新增）
- 表格 `Actions` 列采用“内容驱动宽度估算 + 横向滚动兜底”。
- 统一策略：
  - 列宽根据当前语言与当前行操作文案动态估算
  - `Space` 使用 `wrap` 允许换行
  - 表格 `scroll.x` 使用 `max-content` 兜底
- 目标：避免中英切换后按钮溢出、截断或互相覆盖。

## 3. 业务修复沉淀（2026-02）
### 3.1 问题归类
- 优惠/价格相关 key 存在占位符与调用参数不一致，导致文本不显示或显示异常。
- 详情页与审核页在同一业务实体（房型、优惠）上的展示规则不一致。
- 房型图片字段在数据库/接口已存在，但前端未在关键页面展示。

### 3.2 已落地改动（Admin 端）
- 价格文案修复：`AuditDetail / AdminHotelDetail` 的 `basePrice/currentPrice` 改为模板型文案并正确传参。
- 房型图片展示统一：`HotelDetail / AdminHotelDetail / AuditDetail` 房型表新增图片列。
- 优惠时间可视化统一：
  - `AuditDetail` 增加与详情页一致的优惠甘特图。
  - 房型“优惠”标签统一展示有效期文本。
- 兼容字段读取：图片列读取 `images / image_urls / room_images`，提升历史数据兼容性。

### 3.3 后端与数据库结论
- `room_types.images` 在数据库已存在。
- 商户/管理员详情接口均使用 `room_types.select('*')`，已包含图片与折扣时段字段。
- 本轮以“前端展示链路补齐 + 词典修正”为主，后端无需额外 schema 变更。

## 4. 开发规范（新增/改动必须遵守）
### 4.1 key 命名规范
- 统一格式：`{domain}.{module}.{action}`。
- 示例：`hotels.edit.submitSuccess`、`dashboard.overview.title`。

### 4.2 插值规范
- 插值只放变量，不拼接单位。
- 示例：`t('order.total', { amount })`。
- 新增约束：模板 key 的占位符名必须与调用对象字段名一致。

### 4.3 格式化规范
- 日期/货币/数字/相对时间统一走 `Intl`。
- 不在字符串中硬编码“元/天/分钟前”。

### 4.4 错误处理规范
- 服务层返回稳定错误码，UI 层负责 `t(error.code)` 映射。
- 避免直接把后端错误中文透传到界面。

## 5. 目录约定
- 词典目录：`admin/src/locales/{lng}/{namespace}.json`
- 入口加载器：`admin/src/locales/index.js`
- 路由与 namespace 映射：`admin/src/routes/routeConfig.js`
- i18n 校验脚本：`admin/scripts/i18n-check.js`

## 6. 验收清单（每次国际化改动）
- [ ] 新文案是否只通过 `t()` 渲染
- [ ] `zh-CN` / `en-US` key 是否对齐
- [ ] 模板 key 占位符与调用参数名是否一致
- [ ] 纯标题型 key 是否未混入占位符
- [ ] 新页面是否声明了路由 namespace
- [ ] `npm run i18n:check` 是否通过
- [ ] `npm run i18n:check:strict` 是否通过
- [ ] `npm run build` 是否通过

## 7. 分阶段推进建议
### Phase 1（已完成）
- 语言懒加载
- namespace 拆分
- 核心路由 namespace 按需加载
- 双门禁 CI 脚本

### Phase 2（建议下一步）
- 将 `audit / requests / merchants` 等管理域拆成独立 namespace
- 把对应路由的 `namespaces: []` 替换为真实映射
- 增加 `en-XA` 伪本地化回归（抓漏翻与布局溢出）

### Phase 3（中期）
- 服务端错误码体系标准化并对接前端 i18n 错误映射
- 建立 locale 同源映射（i18n / Antd / Dayjs）
- 新增 lint 规则禁止 key 拼接
