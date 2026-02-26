# Admin 管理端 - Playwright 自动化测试沉淀

> 更新时间：2026-02-26  
> 目标：为 Admin 前端建立可本地稳定运行的 E2E 自动化测试基线，优先覆盖登录与酒店经纬度核心链路。

## 1. 本次落地范围

### 1.1 测试基础设施

- 新增 `admin/playwright.config.js`
  - 指定 `tests/e2e` 目录
  - 默认 Chromium
  - 失败保留 `trace/screenshot/video`
- 新增 `admin/scripts/run-playwright-e2e.js`
  - 动态寻找空闲端口
  - 先启动 Vite，再执行 Playwright
  - 解决本地环境中 `webServer` 端口探测被误判的问题
- 更新 `admin/package.json`
  - `test:e2e`
  - `test:e2e:ui`
  - `test:e2e:report`
- 更新 `admin/.gitignore`
  - 忽略 `playwright-report/`、`test-results/`、`.playwright/`

### 1.2 测试代码与辅助

- 新增 `admin/tests/e2e/auth.smoke.spec.js`
- 新增 `admin/tests/e2e/hotel-geo.smoke.spec.js`
- 新增 `admin/tests/e2e/helpers/mockApi.js`
- 新增 `admin/tests/e2e/helpers/auth.js`

### 1.3 页面可测性增强（最小改动）

为稳定选择器新增了少量 `data-testid/id`：

- `admin/src/pages/Login.jsx`
- `admin/src/pages/HotelEdit.jsx`
- `admin/src/pages/HotelDetail.jsx`
- `admin/src/pages/AuditDetail.jsx`
- `admin/src/pages/AdminHotelDetail.jsx`

## 2. 当前已覆盖的 smoke 场景

1. 登录成功后跳转商户首页（`/hotels`）
2. 新增酒店时提交经纬度（校验提交 payload 中 `lat/lng`）
3. 编辑酒店时更新经纬度（校验更新 payload）
4. 商户酒店详情页经纬度展示
5. 管理员审核详情页经纬度展示 + 审核通过动作

## 3. 执行方式

在 `admin` 目录下执行：

```bash
npm run test:e2e
```

常用：

```bash
# 仅跑部分用例
npm run test:e2e -- --grep "Hotel geo"

# 查看报告
npm run test:e2e:report

# 可视化调试
npm run test:e2e:ui -- --trace on --headed
```

## 4. 目录结构

```text
admin/
├── playwright.config.js
├── scripts/
│   └── run-playwright-e2e.js
└── tests/
    └── e2e/
        ├── auth.smoke.spec.js
        ├── hotel-geo.smoke.spec.js
        └── helpers/
            ├── auth.js
            └── mockApi.js
```

## 5. 设计约束与约定

- 现阶段采用“前端路由 + API 全量 mock”的方式，保证本地稳定、执行快、无后端依赖。
- 选择器优先 `data-testid/id`，避免依赖中文文案与样式结构。
- 用例命名采用 `*.smoke.spec.js`，先守核心链路，再逐步加回归用例。

## 6. 后续扩展建议

1. 增加 admin 审核驳回、请求审核、消息未读数等回归场景。
2. 引入测试数据工厂，减少 spec 内重复 fixture。
3. 后续接 CI 时可采用分层策略：PR 跑 smoke，定时任务跑 full e2e。
