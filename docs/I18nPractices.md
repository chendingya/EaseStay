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

## 3. 开发规范（新增/改动必须遵守）
### 3.1 key 命名规范
- 统一格式：`{domain}.{module}.{action}`。
- 示例：`hotels.edit.submitSuccess`、`dashboard.overview.title`。

### 3.2 插值规范
- 插值只放变量，不拼接单位。
- 示例：`t('order.total', { amount })`。

### 3.3 格式化规范
- 日期/货币/数字/相对时间统一走 `Intl`。
- 不在字符串中硬编码“元/天/分钟前”。

### 3.4 错误处理规范
- 服务层返回稳定错误码，UI 层负责 `t(error.code)` 映射。
- 避免直接把后端错误中文透传到界面。

## 4. 目录约定
- 词典目录：`admin/src/locales/{lng}/{namespace}.json`
- 入口加载器：`admin/src/locales/index.js`
- 路由与 namespace 映射：`admin/src/routes/routeConfig.js`
- i18n 校验脚本：`admin/scripts/i18n-check.js`

## 5. 验收清单（每次国际化改动）
- [ ] 新文案是否只通过 `t()` 渲染
- [ ] `zh-CN` / `en-US` key 是否对齐
- [ ] 新页面是否声明了路由 namespace
- [ ] `npm run i18n:check` 是否通过
- [ ] `npm run i18n:check:strict` 是否通过
- [ ] `npm run build` 是否通过

## 6. 分阶段推进建议
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
