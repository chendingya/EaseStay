# EaseStay 移动端 H5 Lighthouse 性能优化报告

> 测试地址：`http://localhost:8080/#/pages/index/index`  
> Lighthouse 版本：13.0.1 | 测试时间：2026-02-24  
> 优化执行时间：2026-02-24

---

## 一、优化前基线分数

| 类别 | 优化前得分 | 状态 |
|------|-----------|------|
| 性能（Performance） | **67** | 需改进 |
| 可访问性（Accessibility） | **70** | 需改进 |
| 最佳实践（Best Practices） | **96** | 良好 |

### 核心性能指标（优化前）

| 指标 | 数值 | 得分 | 目标值 |
|------|------|------|--------|
| FCP（首次内容绘制） | 3.6 秒 | 32 | < 1.8s |
| LCP（最大内容绘制） | 8.6 秒 | 1 | < 2.5s |
| TBT（总阻塞时间） | 60 ms | 100 | < 200ms |
| CLS（布局偏移） | 0.029 | 100 | < 0.1 |
| Speed Index | 3.6 秒 | 87 | < 3.4s |
| TTI（可交互时间） | 8.7 秒 | 37 | < 3.8s |

---

## 二、本次已实施的优化措施

### 2.1 HTML 模板优化
**文件：** `mobile/src/index.html`

#### 措施 1：添加 `<html lang="zh-CN">` 属性
- **问题：** Lighthouse 检测到 `<html>` 元素缺少 `[lang]` 属性（可访问性得分 0）
- **原因：** 屏幕阅读器（如 VoiceOver、TalkBack）依赖 `lang` 属性来选择正确的语音引擎和发音规则。缺少该属性会导致视障用户无法正常使用。
- **修改：** `<html>` → `<html lang="zh-CN">`
- **预期收益：** 修复一项可访问性 A 级别违规

#### 措施 2：修复 viewport 缩放限制
- **问题：** `user-scalable=no` 阻止用户缩放页面，且 Lighthouse 将其标记为可访问性违规
- **原因：** 低视力用户需要放大页面内容阅读。W3C WCAG 2.1 SC 1.4.4 要求文本可以缩放到 200% 而不丢失功能。
- **修改：** `user-scalable=no` → `maximum-scale=5`（允许用户将页面放大至 5 倍）
- **预期收益：** 修复可访问性违规；`maximum-scale` 设为 5 满足 Lighthouse 要求（≥ 5）

#### 措施 3：添加 `<meta name="description">` 页面描述
- **问题：** Lighthouse SEO 检测到缺少 meta 描述（得分 0）
- **原因：** 搜索引擎（Google、Bing）使用 meta description 生成搜索结果摘要，有助于提升点击率（CTR）
- **修改：** 新增 `<meta name="description" content="易宿酒店 - 精选全国优质酒店...">`
- **预期收益：** 修复 SEO 违规，提升搜索引擎可见性

#### 措施 4：添加 `<meta name="theme-color">` 主题色
- **问题：** PWA 最佳实践建议
- **原因：** 指定品牌主色调，Android 浏览器会将其显示在地址栏/状态栏，提升品牌一致性
- **修改：** 新增 `<meta name="theme-color" content="#0086F6">`

---

### 2.2 Webpack 生产构建优化
**文件：** `mobile/config/prod.js`

#### 措施 5：配置 splitChunks 代码分割
- **问题：** Lighthouse 检测到未使用的 JavaScript 达 **567 KiB**（`chunk/486.js` 283KB、`app.js` 221KB、`js/658.js` 62KB）
- **根本原因：** 未配置 splitChunks 时，所有第三方库（React、antd-mobile、Taro runtime 等）被打包进同一个 JS chunk，浏览器需下载并解析整个 bundle 才能渲染页面，导致 FCP/LCP 严重延迟。
- **修改：** 在 `webpackChain` 中配置 `optimization.splitChunks`，将依赖拆分为：
  - `vendor-react`：React + React DOM（不频繁变化，适合长期缓存）
  - `vendor-antd`：antd-mobile（最大体积来源）
  - `vendor-taro`：Taro 运行时
  - `vendors`：其他第三方包
- **预期收益：**
  - 浏览器可**并行下载**多个小 chunk，而非串行等待单一大文件
  - 应用代码（`app.js`）变更后，vendor chunk 因内容未变仍命中缓存
  - 减少未使用 JS，预计 FCP 从 3.6s 下降至 < 2s，LCP 从 8.6s 下降至 < 4s

#### 措施 6：配置 Terser 压缩（移除 console/debugger）
- **问题：** 生产包中保留了大量 `console.log` 调试日志，增加了 JS 解析时间
- **原因：** 调试日志不仅增加文件体积，浏览器执行时也有字符串拼接开销
- **修改：** 配置 Terser `compress.drop_console = true`，移除 `console.log/info/debug`
- **预期收益：** 减少 JS 体积约 1-3%，减少主线程工作量

#### 措施 7：确定性模块/chunk ID（利于长期缓存）
- **问题：** 未配置时 Webpack 默认使用数字 ID，每次构建可能变化，导致缓存失效
- **原因：** 当 ID 每次构建都不同，即使代码未变，浏览器也会当作新文件重新下载
- **修改：** 设置 `moduleIds('deterministic')` 和 `chunkIds('deterministic')`，基于内容 hash 生成稳定 ID
- **预期收益：** 配合 Nginx 长期缓存策略，vendor chunks 可在用户端缓存 1 年，大幅减少二次访问加载时间

---

### 2.3 图片无障碍优化（alt 属性）
**涉及文件：**
- `mobile/src/components/HotelCard/index.jsx`
- `mobile/src/components/RoomTypeCard/index.jsx`
- `mobile/src/pages/index/index.jsx`（热门酒店瀑布流）
- `mobile/src/pages/detail/index.jsx`（酒店详情 hero 图）
- `mobile/src/pages/room-detail/index.jsx`（房间详情 banner）

#### 措施 8：为所有 `<Image>` 组件添加 `alt` 属性
- **问题：** Lighthouse 可访问性检测到"图片元素缺少 `[alt]` 属性"（得分 0）
- **原因：** `alt` 是 HTML 可访问性最基本要求（WCAG 1.1.1 非文字内容）。屏幕阅读器在遇到无 `alt` 图片时会读出文件 URL，给视障用户带来极差体验。搜索引擎也通过 `alt` 理解图片内容。
- **修改规则：**
  - 有信息内容的图片（酒店名图、房型图）：`alt={hotelName}` / `alt={room?.name || '房型图片'}`
  - 装饰性背景图（detail 页模糊背景层）：`alt=""`（空字符串，告知辅助技术忽略该图片）
- **预期收益：** 修复可访问性 A 级违规，预计可访问性得分从 70 提升至 85+

---

### 2.4 语义化地标标记（Landmark Regions）
**涉及文件：**
- `mobile/src/pages/index/index.jsx`
- `mobile/src/components/GlobalBottomNav/index.jsx`

#### 措施 9：添加 ARIA landmark roles
- **问题：** Lighthouse 检测到"文档缺少主要位置标记（main landmark）"（得分 0）
- **原因：** 屏幕阅读器用户依赖 landmark 进行页面跳转导航（"跳转到主内容"等快捷操作）。没有 `main`、`navigation` 等语义标记，屏幕阅读器用户必须逐一阅读所有内容才能找到目标区域。
- **修改：**
  - 首页根 `<View>` 添加 `role="main"`：标识页面主内容区域
  - `GlobalBottomNav` 根 `<View>` 添加 `role="navigation"` 和 `aria-label="主导航"`：标识主导航区域
- **预期收益：** 修复可访问性违规，提升 ARIA 合规性

---

### 2.5 Nginx 生产缓存配置
**文件：** `mobile/nginx.conf.example`（部署参考文件）

#### 措施 10：静态资源长期缓存策略
- **问题：** Lighthouse 检测到"使用高效的缓存生命周期"问题，潜在节省 **849 KiB** 流量
- **原因：** 未设置缓存时，用户每次访问都重新下载所有 JS/CSS/图片资源。Webpack 为静态资源文件名添加了内容 hash（如 `app.abc123.js`），文件内容不变则 hash 不变，可以安全地设置超长缓存。
- **修改：** 提供 `nginx.conf.example` 配置文件，实现：
  - 带 hash 的 JS/CSS/字体文件：`Cache-Control: max-age=31536000, immutable`（缓存 1 年）
  - 图片资源：`Cache-Control: max-age=2592000`（缓存 30 天）
  - `index.html`：禁止缓存（保证用户始终获取最新 HTML）
  - 开启 Gzip 压缩（进一步减少网络传输量）
- **预期收益：** 回访用户（二次访问）基本无需重新下载静态资源，加载时间接近 0s

---

## 三、优化措施汇总

| # | 问题 | 修改文件 | 类别 | 预期效果 |
|---|------|---------|------|---------|
| 1 | `<html>` 缺少 `lang` 属性 | `src/index.html` | 可访问性 | 修复 A 级违规 |
| 2 | viewport 禁止缩放 | `src/index.html` | 可访问性 | 修复缩放访问问题 |
| 3 | 缺少 meta description | `src/index.html` | SEO | 改善搜索摘要 |
| 4 | 添加 theme-color | `src/index.html` | 最佳实践 | 提升品牌体验 |
| 5 | 567KB 未使用 JS（splitChunks） | `config/prod.js` | 性能 ⭐ | FCP/LCP 显著下降 |
| 6 | 生产包含调试日志（Terser） | `config/prod.js` | 性能 | 减少 JS 体积 |
| 7 | chunk ID 不稳定影响缓存 | `config/prod.js` | 性能 | 提升缓存命中率 |
| 8 | 5 处图片缺少 alt 属性 | 多个组件/页面 | 可访问性 ⭐ | 修复 A 级违规 |
| 9 | 页面缺少语义化地标 | index + BottomNav | 可访问性 | 修复 landmark 违规 |
| 10 | 静态资源无缓存策略（849KB） | `nginx.conf.example` | 性能 ⭐ | 大幅减少回访加载量 |

---

## 四、预期优化后分数

| 类别 | 优化前 | 预期优化后 | 核心改善点 |
|------|--------|-----------|-----------|
| 性能 | 67 | **80~88** | splitChunks 减少 JS / 缓存策略 |
| 可访问性 | 70 | **90~95** | alt + lang + viewport + landmark |
| 最佳实践 | 96 | **96** | 维持现状 |

---

## 五、尚未处理的问题（需进一步排查）

### 颜色对比度（Lighthouse 检测到"背景色和前景色对比度不足"）
- **建议：** 使用 Chrome DevTools 的「检查可访问性」功能，或安装 axe DevTools 浏览器扩展定位对比度不合格的具体元素
- **标准：** 普通文字对比度 ≥ 4.5:1；大文字（≥ 18pt 或 ≥ 14pt 加粗）≥ 3:1
- **常见问题区域：** `hotel-card-meta-item`（灰色小字）、`room-type-card-meta`（浅灰信息文字）

### LCP 进一步优化
- 首屏 Banner 当前为 CSS 渐变色（无实际图片），LCP 长主要因 JS bundle 过大阻塞渲染
- 待 splitChunks 上线后重新跑 Lighthouse 评估实际改善幅度
- 若 LCP 仍不达标，可考虑：SSR（服务端渲染）或骨架屏（Skeleton Screen）加速首屏视觉反馈

### 93KB 未使用 CSS（`486.css`）
- 建议引入 [PurgeCSS](https://purgecss.com/) 在构建时自动移除未用到的 CSS 规则
- 可在 Taro 的 PostCSS 配置中添加

---

## 六、重新构建步骤

```bash
cd mobile
npm run build:h5
# 将 dist/ 目录部署至服务器
# 应用 nginx.conf.example 中的缓存配置
```

构建完成后，使用 Chrome DevTools → Lighthouse 重新跑评测，验证以上改进效果。
