const path = require("path");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "易宿酒店预订平台";
pptx.company = "训练营答辩";
pptx.subject = "三端架构与技术实现";
pptx.title = "易宿酒店预订平台答辩PPT V7";
pptx.theme = {
  headFontFace: "Microsoft YaHei",
  bodyFontFace: "Microsoft YaHei",
  lang: "zh-CN"
};

const COLORS = {
  navy: "071B4D",
  blue: "1677FF",
  cyan: "39A9FF",
  mint: "4CC9F0",
  light: "EAF4FF",
  white: "FFFFFF",
  text: "0E1F3D",
  muted: "5B6B8C",
  border: "B8DCFF",
  codeBg: "0D2A63",
  codeText: "C9DEFF"
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const OUTPUT = path.resolve(__dirname, "..", "docs", "答辩PPT_v7_蓝色多巴胺版.pptx");

const addBg = (slide, dark = false) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: dark ? COLORS.navy : COLORS.light },
    line: { color: dark ? COLORS.navy : COLORS.light }
  });
};

const addSectionHeader = (slide, title, subtitle = "") => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.65,
    y: 0.35,
    w: 0.18,
    h: 0.62,
    fill: { color: COLORS.blue },
    line: { color: COLORS.blue },
    radius: 0.05
  });
  slide.addText(title, {
    x: 0.92,
    y: 0.32,
    w: 9.8,
    h: 0.55,
    fontSize: 30,
    bold: true,
    color: COLORS.text
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.94,
      y: 0.86,
      w: 10.2,
      h: 0.28,
      fontSize: 12,
      color: COLORS.muted
    });
  }
};

const addTag = (slide, text) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.25,
    y: 0.4,
    w: 2.35,
    h: 0.45,
    fill: { color: COLORS.blue },
    line: { color: COLORS.blue },
    radius: 0.08
  });
  slide.addText(text, {
    x: 10.4,
    y: 0.5,
    w: 2.05,
    h: 0.22,
    fontSize: 11,
    color: COLORS.white,
    align: "center",
    bold: true
  });
};

const addCard = (slide, x, y, w, h, title, body) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 1.2 },
    radius: 0.08
  });
  slide.addText(title, {
    x: x + 0.18,
    y: y + 0.14,
    w: w - 0.36,
    h: 0.28,
    fontSize: 15,
    bold: true,
    color: COLORS.blue
  });
  slide.addText(body, {
    x: x + 0.18,
    y: y + 0.48,
    w: w - 0.36,
    h: h - 0.62,
    fontSize: 12.5,
    color: COLORS.muted,
    valign: "top"
  });
};

const addCompactCard = (slide, x, y, w, h, title, body) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 1.1 },
    radius: 0.08
  });
  slide.addText(title, {
    x: x + 0.12,
    y: y + 0.1,
    w: w - 0.24,
    h: 0.22,
    fontSize: 11.5,
    bold: true,
    color: COLORS.blue
  });
  slide.addText(body, {
    x: x + 0.12,
    y: y + 0.34,
    w: w - 0.24,
    h: h - 0.4,
    fontSize: 8.3,
    color: COLORS.muted,
    valign: "top"
  });
};

const addCode = (slide, x, y, w, h, code) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.codeBg },
    line: { color: "1F4A96", width: 1 },
    radius: 0.08
  });
  slide.addText(code, {
    x: x + 0.16,
    y: y + 0.14,
    w: w - 0.32,
    h: h - 0.28,
    fontFace: "Consolas",
    fontSize: 10.5,
    color: COLORS.codeText,
    valign: "top"
  });
};

const addMetric = (slide, x, y, w, h, value, label) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 1 },
    radius: 0.08
  });
  slide.addText(value, {
    x: x + 0.08,
    y: y + 0.1,
    w: w - 0.16,
    h: 0.45,
    fontSize: 28,
    bold: true,
    color: COLORS.blue,
    align: "center"
  });
  slide.addText(label, {
    x: x + 0.08,
    y: y + 0.62,
    w: w - 0.16,
    h: 0.25,
    fontSize: 11,
    color: COLORS.muted,
    align: "center"
  });
};

const addStateNode = (slide, x, y, w, h, title, sub = "", tone = "blue") => {
  const fill = tone === "mint" ? "E9FBFF" : "EEF5FF";
  const line = tone === "mint" ? "67D7E6" : "8FC4FF";
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: line, width: 1.2 },
    radius: 0.08
  });
  slide.addText(title, {
    x: x + 0.08, y: y + 0.1, w: w - 0.16, h: 0.24,
    fontSize: 11.5, bold: true, color: COLORS.text, align: "center"
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.08, y: y + 0.34, w: w - 0.16, h: 0.2,
      fontSize: 9.5, color: COLORS.muted, align: "center"
    });
  }
};

const addArrow = (slide, x, y, w, h, text = "", color = COLORS.cyan) => {
  const safeW = Math.abs(w) < 0.01 ? (w < 0 ? -0.01 : 0.01) : w;
  const safeH = Math.abs(h) < 0.01 ? (h < 0 ? -0.01 : 0.01) : h;
  const lineStyle = { color, width: 1.6, endArrowType: "triangle" };
  slide.addShape(pptx.ShapeType.line, { x, y, w: safeW, h: safeH, line: lineStyle });
  if (text) {
    slide.addText(text, {
      x: x + (safeW >= 0 ? 0 : safeW) + 0.05,
      y: y + (safeH >= 0 ? 0 : safeH) - 0.16,
      w: Math.max(Math.abs(safeW), 1.3),
      h: 0.2,
      fontSize: 9,
      color: COLORS.muted,
      align: "center"
    });
  }
};

// 0 封面
{
  const s = pptx.addSlide();
  addBg(s, true);
  s.addText("易宿酒店预订平台", {
    x: 0.85, y: 2.0, w: 9.8, h: 0.9,
    fontSize: 52, bold: true, color: COLORS.white
  });
  s.addText("三端架构设计与技术实现", {
    x: 0.9, y: 3.05, w: 8.6, h: 0.5,
    fontSize: 24, color: "D7E6FF", bold: true
  });
  s.addText("性能优化 / 组件抽象 / 动效体系", {
    x: 0.9, y: 3.6, w: 7.5, h: 0.35,
    fontSize: 14, color: "B8D6FF"
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 4.45, w: 4.4, h: 0.62,
    fill: { color: COLORS.blue }, line: { color: COLORS.blue }, radius: 0.1
  });
  s.addText("移动端 · 管理端 · 服务端", {
    x: 1.12, y: 4.62, w: 4.0, h: 0.28,
    fontSize: 15, color: COLORS.white, bold: true
  });
}

// 1 目录
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "目录", "本次汇报重点：三端技术深度与专项优化");
  const items = [
    "01 项目目标与技术挑战",
    "02 三端协同总架构（含技术栈）",
    "03 三端系统分层架构图（PPT）",
    "04 移动端：架构 + 实现",
    "05 管理端：架构 + 实现",
    "06 服务端：架构 + 实现",
    "07 三大专项：性能 / 抽象 / 动效",
    "08 总结与下一步"
  ];
  items.forEach((it, idx) => {
    s.addText(it, {
      x: 1.05, y: 1.35 + idx * 0.7, w: 10.6, h: 0.36,
      fontSize: 20, color: COLORS.text
    });
  });
}

// 2 项目目标与挑战
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "项目目标与技术挑战");
  addCard(s, 0.82, 1.35, 3.95, 2.25, "业务目标", "打通“发布 -> 审核 -> 预订 -> 支付 -> 通知”全链路闭环。");
  addCard(s, 4.92, 1.35, 3.95, 2.25, "系统范围", "移动端下单 + 管理端审核 + 服务端状态机与权限治理。");
  addCard(s, 9.02, 1.35, 3.5, 2.25, "答辩重点", "不仅讲功能完成，还讲工程化与架构方法。");
  addCard(s, 0.82, 3.85, 11.7, 2.95, "核心技术挑战", "1) 三端协同一致性\n2) 管理端长列表和重组件性能\n3) 页面/组件重复实现带来的维护成本\n4) 动效体验统一与性能平衡");
}

// 3 三端总架构（PPT直绘）
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "三端协同总架构（含技术栈）");
  addTag(s, "PPT Direct Draw");
  // left architecture area
  addCard(s, 0.82, 1.32, 2.4, 0.96, "移动端", "Taro + React + antd-mobile");
  addCard(s, 3.48, 1.32, 2.4, 0.96, "管理端", "React + Vite + AntD");
  addCard(s, 2.0, 2.58, 4.05, 0.96, "API Gateway", "Express + JWT + 路由聚合 + 接口兼容");

  addCompactCard(s, 0.9, 3.86, 1.45, 0.9, "Auth", "鉴权/角色");
  addCompactCard(s, 2.51, 3.86, 1.45, 0.9, "Hotel", "库存/状态");
  addCompactCard(s, 4.12, 3.86, 1.45, 0.9, "Request", "审核流转");
  addCompactCard(s, 5.73, 3.86, 1.45, 0.9, "Order", "下单/支付");
  addCompactCard(s, 7.34, 3.86, 1.45, 0.9, "Notify", "消息通知");

  addCard(s, 2.05, 5.12, 2.85, 0.95, "Supabase", "PostgreSQL 业务主数据");
  addCard(s, 5.2, 5.12, 2.65, 0.95, "Map Service", "POI / 地理编码");

  addArrow(s, 3.24, 1.79, 0.22, 0, "");
  addArrow(s, 2.0, 2.28, 0.0, 0.26, "");
  addArrow(s, 4.8, 2.28, 0.0, 0.26, "");
  addArrow(s, 4.03, 3.53, 0.0, 0.24, "");
  addArrow(s, 3.13, 4.76, 0.9, 0.24, "");
  addArrow(s, 4.03, 4.76, 2.0, 0.24, "");

  // right side panel (no overlap)
  addCard(s, 9.25, 1.32, 3.35, 2.05, "三端技术栈", "移动端：Taro + React\n管理端：React + Vite + AntD\n服务端：Node + Express + JWT\n数据：Supabase + Map");
  addCode(s, 9.25, 3.45, 3.35, 2.0, "router.use('/merchant/hotels',\n  authRequired,\n  requireRole('merchant'),\n  merchantHotelRoutes)\nrouter.use('/admin/hotels',\n  authRequired,\n  requireRole('admin'),\n  adminHotelRoutes)");
  addCard(s, 9.25, 5.56, 3.35, 1.0, "讲解重点", "双前端共网关；规则集中在 service；跨端行为一致。");
}

// 4 移动端架构（插图）
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "三端系统分层架构图（PPT 分层版）", "按企业常见分层范式描述三端系统");
  addTag(s, "Layered Architecture");

  addCard(s, 0.78, 1.18, 9.05, 0.92, "接入层 Client Layer", "移动端（Taro/H5） + 管理端（Web） + 角色入口（用户/商户/管理员）");
  addCard(s, 0.78, 2.2, 9.05, 0.92, "应用层 Application Layer", "页面路由、业务页面、统一查询与列表抽象、国际化命名空间加载");
  addCard(s, 0.78, 3.22, 9.05, 0.92, "接口层 API Gateway Layer", "Express API 网关、JWT 鉴权、参数校验、路由聚合、接口兼容");
  addCard(s, 0.78, 4.24, 9.05, 0.92, "领域服务层 Domain Service Layer", "hotelService / requestService / authService：状态机、库存、订单、通知规则");
  addCard(s, 0.78, 5.26, 9.05, 0.92, "数据与外部层 Data & Integration Layer", "Supabase(PostgreSQL) + 地图服务（POI/地理编码）");

  s.addShape(pptx.ShapeType.roundRect, {
    x: 10.05, y: 1.18, w: 2.48, h: 5.45,
    fill: { color: COLORS.white },
    line: { color: "D2BBE8", width: 1.2 },
    radius: 0.08
  });
  s.addText("横切能力", {
    x: 10.13, y: 1.3, w: 2.25, h: 0.26,
    fontSize: 13, bold: true, color: "A24CCF", align: "center"
  });
  addCompactCard(s, 10.15, 1.78, 2.2, 1.0, "鉴权与权限", "RequireAuth / RequireRole\nauthRequired / requireRole");
  addCompactCard(s, 10.15, 2.93, 2.2, 1.0, "性能优化", "懒加载、请求时机优化\n分页与渲染减负");
  addCompactCard(s, 10.15, 4.08, 2.2, 1.0, "组件抽象", "ListContainer / createListByType\nTabBase / QueryHook");
  addCompactCard(s, 10.15, 5.23, 2.2, 1.0, "动效体系", "统一入口、统一节奏\n统一回退");

  addCode(s, 0.78, 6.24, 11.75, 0.9, "router -> controller -> service -> data：三端统一经过网关，规则集中在 service，保证业务约束在所有端一致。");
}

// 5 移动端架构（PPT直绘）
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "移动端架构设计（Taro + React）");
  addTag(s, "Page->Factory->Container->Card");
  addCard(s, 0.82, 1.35, 2.65, 0.95, "Page Layer", "detail / favorites / orders");
  addCard(s, 3.78, 1.35, 2.65, 0.95, "List Factory", "createListByType");
  addCard(s, 6.74, 1.35, 2.65, 0.95, "List Container", "OrderList / ListContainer");
  addCard(s, 9.7, 1.35, 2.8, 0.95, "Card Layer", "Order / Hotel / RoomType");
  addArrow(s, 3.48, 1.84, 0.26, 0, "");
  addArrow(s, 6.44, 1.84, 0.26, 0, "");
  addArrow(s, 9.4, 1.84, 0.26, 0, "");

  addCard(s, 0.82, 2.65, 5.85, 2.0, "容器层职责", "ScrollView / 下拉刷新 / 上拉加载 / 骨架屏 / 空态 / 入场动效。\n业务页只负责数据编排与回调，不重复实现列表交互。");
  addCard(s, 6.87, 2.65, 5.65, 2.0, "单一动效入口", "list-stagger-enter + animationDelay。\n卡片层禁止额外入场动画，避免多入口节奏冲突。");
  addCode(s, 0.82, 4.85, 5.85, 1.55, "const delay = animate ? `${Math.min(index, 10) * 20}ms` : '0ms'\nclassName={`list-item${animate ? ' list-stagger-enter' : ''}`}");
  addCard(s, 6.87, 4.85, 5.65, 1.55, "复用收益", "detail/favorites/orders 三页复用同一抽象，交互一致、维护成本更低。");
}

// 6 移动端实现：组件抽象
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "移动端技术实现（组件抽象）");
  addCard(s, 0.82, 1.35, 3.8, 2.55, "抽象组件", "ListContainer\ncreateListByType\nOrderCard / HotelCard / RoomTypeCard\nSwipeAction(收藏可选能力)");
  addCard(s, 4.82, 1.35, 3.8, 2.55, "复用页面", "pages/detail\npages/favorites\npages/orders\n三处统一同一渲染链路");
  addCard(s, 8.82, 1.35, 3.7, 2.55, "职责边界", "页面：请求 + 回调\n容器：滚动/刷新/加载/空态/骨架/动效\n卡片：纯业务展示");
  addCode(s, 0.82, 4.15, 6.0, 2.15, "createListByType({\n  type: 'favorite',\n  items,\n  onOpen,\n  onRemove,\n  animate: true\n})");
  addCard(s, 7.02, 4.15, 5.5, 2.15, "答辩讲法", "先讲“为什么要抽象”，再讲“抽象后减少了什么重复”，最后落到复用页面数量和一致性收益。");
}

// 7 移动端实现：动效细节
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "移动端技术实现（动效详细版）");
  addCard(s, 0.82, 1.3, 2.8, 1.65, "触发", "animate=true\n列表项注入 class");
  addCard(s, 3.82, 1.3, 2.8, 1.65, "编排", "delay = min(index,10)*20ms\n前10项阶梯入场");
  addCard(s, 6.82, 1.3, 2.8, 1.65, "执行", "0.22s + ease-out\ntranslateY + scale");
  addCard(s, 9.82, 1.3, 2.7, 1.65, "反馈", "下拉点动画 0.9s\nready 状态颜色变化");
  addCode(s, 0.82, 3.2, 5.85, 2.9, "const delay = animate && Number.isFinite(index)\n  ? `${Math.min(index, 10) * 20}ms`\n  : '0ms'\n\n.list-item.list-stagger-enter {\n  animation: list-item-enter 0.22s ease-out both;\n}\n@keyframes list-item-enter { from { opacity:0; transform: translateY(6px) scale(.995); } to { opacity:1; transform: translateY(0) scale(1); } }");
  addCard(s, 6.87, 3.2, 5.65, 2.9, "设计约束", "只允许容器层触发入场动画，卡片层禁止额外入场动效，避免双动画导致节奏冲突和重排抖动。");
}

// 8 管理端架构（PPT直绘）
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "管理端架构设计（React + Vite + AntD）");
  addTag(s, "性能 + 复用 + 权限");
  addCard(s, 0.82, 1.35, 2.85, 0.95, "Route Layer", "React.lazy 路由分包");
  addCard(s, 4.0, 1.35, 3.25, 0.95, "Query Layer", "useRemoteTableQuery + TableFilterBar");
  addCard(s, 7.58, 1.35, 2.95, 0.95, "Feature Layer", "RoomsTabBase / OrdersTabBase");
  addCard(s, 10.86, 1.35, 1.65, 0.95, "Guard", "RequireAuth / RequireRole");
  addArrow(s, 3.67, 1.84, 0.28, 0, "");
  addArrow(s, 7.25, 1.84, 0.28, 0, "");
  addArrow(s, 10.53, 1.84, 0.28, 0, "");

  addCard(s, 0.82, 2.65, 3.9, 2.0, "性能优化路径", "懒加载（页面/弹窗/表格/图表）\n请求时机优化（空闲/按tab）\n渲染减负（分页/memo/content-visibility）");
  addCard(s, 4.92, 2.65, 3.9, 2.0, "复用路径", "查询态复用：useRemoteTableQuery\n筛选区复用：TableFilterBar\n详情页复用：RoomsTabBase / OrdersTabBase");
  addCard(s, 9.02, 2.65, 3.5, 2.0, "权限路径", "前端路由守卫 + 后端中间件双层控制\n无 token 401，角色不符 403。");
  addCode(s, 0.82, 4.85, 6.0, 1.55, "const DashboardBatchModals = lazy(() => import('../components/DashboardBatchModals.jsx'))\nconst AuditTable = lazy(() => import('../components/audit/AuditTable.jsx'))");
  addCode(s, 7.02, 4.85, 5.5, 1.55, "<Route element={<RequireRole role={auth.role} allow=\"admin\" />}>\n  <Route path=\"/admin-hotels\" element={<AdminHotels />} />\n</Route>");
}

// 9 管理端实现：性能优化
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "管理端技术实现（性能优化怎么做）");
  addCard(s, 0.82, 1.35, 3.8, 2.55, "路由与模块懒加载", "App.jsx 路由 lazy=15\n弹窗/图表/表格按交互加载\n首屏减少解析执行负担");
  addCard(s, 4.82, 1.35, 3.8, 2.55, "请求时机优化", "低优先级数据空闲请求\n订单/统计按 tab 激活请求\n减少关键路径阻塞");
  addCard(s, 8.82, 1.35, 3.7, 2.55, "渲染减负", "分页 + memo 收口\n列表条目 content-visibility\n减少无意义重渲染");
  addCode(s, 0.82, 4.2, 7.1, 2.1, "const DashboardBatchModals = lazy(() => import('../components/DashboardBatchModals.jsx'))\nconst AuditTable = lazy(() => import('../components/audit/AuditTable.jsx'))\nconst ReactECharts = lazy(() => import('echarts-for-react'))");
  addMetric(s, 8.15, 4.2, 1.35, 1.0, "15", "路由lazy");
  addMetric(s, 9.65, 4.2, 1.35, 1.0, "25", "优化记录");
  addMetric(s, 11.15, 4.2, 1.35, 1.0, "18", "覆盖模块");
}

// 10 管理端实现：页面与组件复用
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "管理端技术实现（页面与组件复用）");
  addCard(s, 0.82, 1.35, 4.0, 2.7, "查询态复用", "useRemoteTableQuery 统一：\nkeyword / page / pageSize / total\nsearch 防抖与分页回退逻辑");
  addCard(s, 5.02, 1.35, 3.7, 2.7, "筛选区复用", "TableFilterBar 统一筛选区结构\n减少页面级筛选UI重复实现");
  addCard(s, 8.92, 1.35, 3.6, 2.7, "详情页复用", "RoomsTabBase / OrdersTabBase\n商户与管理员页面差异通过配置注入");
  addCode(s, 0.82, 4.3, 5.9, 2.0, "export const useRemoteTableQuery = ({\n  initialPageSize = 10,\n  debounceMs = 350\n} = {}) => { ... }");
  addCard(s, 6.92, 4.3, 5.6, 2.0, "复用效果", "从“页面复制粘贴”转为“共享基座 + 配置差异”，后续优化只改一处即可同步两端。");
}

// 11 管理端实现：鉴权与权限
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "管理端技术实现（鉴权与权限管理）");
  addCard(s, 0.82, 1.35, 3.9, 2.6, "前端守卫", "RequireAuth：无 token 跳 /login\nRequireRole：角色不匹配跳 /unauthorized\nadmin / merchant 路由分组");
  addCard(s, 4.92, 1.35, 3.9, 2.6, "后端中间件", "authRequired：Bearer Token 校验\nrequireRole(role)：角色校验\n401 与 403 语义清晰");
  addCard(s, 9.02, 1.35, 3.5, 2.6, "一致性", "前端路由层和后端接口层双重约束，避免仅前端校验导致的越权风险。");
  addCode(s, 0.82, 4.2, 5.95, 2.2, "const authRequired = (req, res, next) => {\n  const token = header.startsWith('Bearer ') ? header.slice(7) : null\n  if (!token) return res.status(401).json({ message: '未登录或令牌缺失' })\n  req.user = verifyToken(token)\n  next()\n}");
  addCode(s, 6.97, 4.2, 5.55, 2.2, "<Route element={<RequireRole role={auth.role} allow=\"admin\" />}>\n  <Route path=\"/admin-hotels\" element={<AdminHotels />} />\n  <Route path=\"/audit\" element={<Audit />} />\n</Route>");
}

// 12 服务端架构（PPT直绘）
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "服务端架构设计（Express + Supabase）");
  addTag(s, "Router/Controller/Service/Data");
  addCard(s, 0.82, 1.35, 2.85, 0.95, "Router Layer", "统一装配路由与中间件");
  addCard(s, 4.0, 1.35, 2.85, 0.95, "Controller Layer", "参数解析 + 响应");
  addCard(s, 7.18, 1.35, 2.85, 0.95, "Service Layer", "状态机/库存/订单/通知");
  addCard(s, 10.36, 1.35, 2.15, 0.95, "Data Layer", "PostgreSQL + Map");
  addArrow(s, 3.67, 1.84, 0.28, 0, "");
  addArrow(s, 6.85, 1.84, 0.28, 0, "");
  addArrow(s, 10.03, 1.84, 0.28, 0, "");

  addCard(s, 0.82, 2.65, 5.85, 2.05, "鉴权与权限", "authRequired：Bearer Token 校验 -> 401\nrequireRole(role)：角色校验 -> 403\n路由注册阶段统一挂载中间件。");
  addCard(s, 6.87, 2.65, 5.65, 2.05, "状态规则集中", "订单/酒店状态迁移规则统一在 service。\n前端不再各自维护状态判断，避免跨端漂移。");
  addCode(s, 0.82, 4.9, 11.7, 1.55, "router.use('/admin/hotels', authRequired, requireRole('admin'), adminHotelRoutes)\nrouter.use('/merchant/hotels', authRequired, requireRole('merchant'), merchantHotelRoutes)\nrouter.use('/requests', authRequired, requestRoutes)");
}

// 13 服务端实现：状态机与一致性
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "服务端技术实现（状态机与跨端一致性）", "状态节点 + 迁移事件 + 规则落点");

  // left side: two FSM panels
  addCard(s, 0.82, 1.14, 8.55, 2.45, "订单状态机 Order FSM", "");
  addStateNode(s, 1.22, 1.9, 2.0, 0.72, "pending_payment", "待支付");
  addStateNode(s, 3.62, 1.9, 2.0, 0.72, "confirmed", "已确认");
  addStateNode(s, 6.02, 1.9, 2.0, 0.72, "finished", "已完成");
  addStateNode(s, 6.02, 2.88, 2.0, 0.72, "cancelled", "已取消");
  addArrow(s, 3.25, 2.26, 0.32, 0, "");
  addArrow(s, 5.65, 2.26, 0.32, 0, "");
  addArrow(s, 5.65, 2.3, 0.32, 0.9, "");
  addArrow(s, 3.22, 2.35, 2.75, 0.95, "");
  s.addText("支付成功", { x: 3.3, y: 2.03, w: 0.9, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("核销入住", { x: 5.7, y: 2.03, w: 0.9, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("商户取消", { x: 6.1, y: 2.63, w: 0.85, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("超时/用户取消", { x: 4.42, y: 3.04, w: 1.4, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });

  addCard(s, 0.82, 3.82, 8.55, 2.55, "酒店状态机 Hotel FSM", "");
  addStateNode(s, 1.22, 4.66, 2.0, 0.7, "pending", "待审核", "mint");
  addStateNode(s, 3.72, 4.66, 2.0, 0.7, "approved", "已上架", "mint");
  addStateNode(s, 6.22, 4.66, 2.0, 0.7, "offline", "已下线", "mint");
  addStateNode(s, 3.72, 5.55, 2.0, 0.7, "rejected", "已驳回", "mint");
  addArrow(s, 3.25, 5.0, 0.42, 0, "");
  addArrow(s, 3.25, 5.06, 0.42, 0.55, "");
  addArrow(s, 5.75, 5.0, 0.42, 0, "");
  s.addText("审核通过", { x: 3.22, y: 4.8, w: 0.9, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("审核驳回", { x: 3.22, y: 5.22, w: 0.9, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("主动下线", { x: 5.7, y: 4.8, w: 0.9, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });
  s.addText("restore：offline -> approved", { x: 5.08, y: 4.58, w: 1.45, h: 0.2, fontSize: 8.8, color: COLORS.muted, align: "center" });
  s.addText("驳回后修正可重新提审", { x: 3.48, y: 6.18, w: 2.5, h: 0.2, fontSize: 9, color: COLORS.muted, align: "center" });

  // right side rules panel
  addCode(s, 9.62, 1.4, 2.75, 4.95, "规则落点（service）\n- 状态迁移合法性校验\n- 角色与权限校验\n- 库存可售校验\n- 订单/酒店状态同步\n\n价值：\n前端不再各自维护状态规则\n跨端行为保持一致");
}

// 14 三大专项总结
{
  const s = pptx.addSlide();
  addBg(s, false);
  addSectionHeader(s, "三大专项总结：性能 / 抽象 / 动效");
  addMetric(s, 0.82, 1.35, 2.2, 1.2, "25", "优化记录");
  addMetric(s, 3.22, 1.35, 2.2, 1.2, "15", "路由lazy");
  addMetric(s, 5.62, 1.35, 2.2, 1.2, "18", "覆盖模块");
  addMetric(s, 8.02, 1.35, 2.2, 1.2, "3", "核心端");
  addMetric(s, 10.42, 1.35, 2.2, 1.2, "1", "动效入口");
  addCard(s, 0.82, 2.85, 3.9, 3.7, "性能优化", "关键路径减负\n请求时机优化\n渲染减负（分页/memo/content-visibility）");
  addCard(s, 4.92, 2.85, 3.9, 3.7, "组件抽象", "移动端：ListContainer + 工厂\n管理端：查询抽象 + 共享基座\n服务端：分层职责清晰");
  addCard(s, 9.02, 2.85, 3.5, 3.7, "动效体系", "统一入口、统一节奏、统一回退\n代码规模可控\n体验一致且稳定");
}

// 15 总结与下一步
{
  const s = pptx.addSlide();
  addBg(s, true);
  s.addText("总结与下一步", {
    x: 0.9, y: 0.8, w: 8.2, h: 0.7,
    fontSize: 40, bold: true, color: COLORS.white
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 1.9, w: 11.8, h: 4.95,
    fill: { color: "0D2A63", transparency: 8 },
    line: { color: "2F63C8", width: 1 },
    radius: 0.12
  });
  s.addText("Phase 2：管理端继续细分业务域 namespace 与路由边界。\nPhase 2：移动端补充可观测埋点（刷新成功率、触底耗时、掉帧率）。\nPhase 3：服务端错误码标准化，前后端 i18n 错误映射统一。\nPhase 3：建立跨端性能预算（包体/LCP/接口耗时）并接入 CI 门禁。", {
    x: 1.3, y: 2.35, w: 11.1, h: 3.4,
    fontSize: 16, color: "D7E6FF", valign: "top"
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 6.05, w: 9.6, h: 0.6,
    fill: { color: COLORS.blue }, line: { color: COLORS.blue }, radius: 0.08
  });
  s.addText("结论：三端分层架构 + 具体工程实践 + 可量化优化结果，能支撑企业导师视角下的技术答辩深度。", {
    x: 1.15, y: 6.2, w: 9.1, h: 0.3,
    fontSize: 12.5, color: COLORS.white, bold: true
  });
}

pptx.writeFile({ fileName: OUTPUT });
