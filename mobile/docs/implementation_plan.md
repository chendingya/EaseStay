# 易宿酒店预订平台 (移动端) - 分步实现方案

本文档基于 `EaseStay/docs` 中的 PRD、架构文档和 SDD 编写，旨在指导开发者分步完成移动端（Taro + React）的开发任务。

## 1. 项目准备与基础建设

### 1.1 依赖管理与组件库选型
**目标**：复刻携程用户界面（蓝色系风格），主要面向 **小程序** 和 **H5**。
**决策**：**确认采用方案 A** —— 使用 `antd-mobile` (v5)。
*   **理由**：`antd-mobile` 的设计风格与“携程蓝”高度契合，能以最低成本复刻目标 UI。
*   **注意**：此方案专注于 **小程序** 和 **Web/H5** 体验。由于 `antd-mobile` 依赖 DOM，此方案**放弃原生 React Native (App) 支持**（但可通过 WebView 嵌入 H5 实现 App 包装）。

**执行动作**:
```bash
# 1. 移除 PC 端组件库 (antd 不适用于移动端)
npm uninstall antd

# 2. 安装 antd-mobile
npm install antd-mobile

# 3. 安装 Taro HTML 适配插件 (用于支持小程序渲染 div 等标签)
npm install @tarojs/plugin-html
```

### 1.2 项目配置 (关键)
修改 `config/index.js` 以启用 HTML 插件，使 `antd-mobile` 能在小程序中正常运行。

```javascript
// config/index.js
const config = {
  // ... 其他配置
  plugins: [
    '@tarojs/plugin-platform-h5',
    '@tarojs/plugin-html' // 新增这一行
  ],
  // ...
}
```

### 1.3 目录结构规划
(保持不变)

### 1.4 网络请求封装
(保持不变)

---

## 2. 核心功能开发步骤

### 步骤 1：清理与重构首页
**目标**：将现有的 `src/pages/index/index.jsx` 中使用的 `antd` (PC) 组件替换为 `antd-mobile` 组件。

1.  **移除 Antd 引用**: 删除 `import { Button... } from 'antd'`.
2.  **引入 Antd Mobile**: `import { Button, Card, SearchBar, Tag, Swiper } from 'antd-mobile'`.
3.  **替换组件**:
    *   `Card` -> `Card` (antd-mobile 的 Card).
    *   `Input` -> `SearchBar` 或 `Input`.
    *   `Space` -> `Space`.
    *   `Tag` -> `Tag`.

### 步骤 2：公共组件开发
1.  **PriceText (价格显示)**
    *   样式：携程风格，橙色/蓝色数字，小符号。
2.  **HotelCard (酒店卡片)**
    *   布局：左图右文。
    *   内容：图片、店名、钻石/星级、评分（蓝色高亮）、最低价（大号字体）。

### 步骤 3：首页 (Home) 功能增强
1.  **Banner**: 使用 `Swiper` 展示活动图。
2.  **携程风搜索模块**:
    *   **容器**: 白色圆角卡片，浮在 Banner 之上。
    *   **城市/定位**: 左侧显示“当前位置/上海”，带定位图标。
    *   **日期选择**:
        *   使用 `Calendar` 组件（antd-mobile v5 支持）。
        *   显示：入住日期 | 离店日期 | 共X晚。
    *   **关键字**: `Input`，Placeholder "关键字/位置/品牌/酒店名"。
    *   **按钮**: 蓝色大按钮“查询”，点击跳转列表页。

### 步骤 4：列表页 (List) 开发
1.  **筛选栏 (Filter Bar)**:
    *   使用 `Dropdown` 或 `CapsuleTabs` (胶囊选项卡) 实现筛选。
    *   项：推荐排序、价格星级、位置区域、更多筛选。
2.  **列表**:
    *   使用 `InfiniteScroll` (antd-mobile) 实现无限加载。
    *   **卡片设计**: 突出评分（如 "4.8分 棒"）、标签（"近地铁"、"免费取消"）。

### 步骤 5：详情页 (Detail) 开发
1.  **顶部交互**: 沉浸式图片 Header。
2.  **信息区**: 地图入口、设施图标、点评摘要。
3.  **房型列表**:
    *   分组展示（如“标准房”、“豪华房”）。
    *   列表项：图片、床型、早餐、取消政策、**在线付/到店付** 标签。
    *   预订按钮：橙色/蓝色“预订”。

---

## 3. 数据与 API 对接 (Mock 阶段)
(保持不变)

---

## 4. 验证与调试
1.  **小程序适配验证**: 确保安装 `@tarojs/plugin-html` 后，`antd-mobile` 的组件（如 `Button`）在小程序模拟器中能正常渲染，无样式崩坏。
2.  **H5 验证**: 确保移动端浏览器预览正常。


