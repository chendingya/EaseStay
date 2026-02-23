const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "易宿酒店预订平台";
pptx.company = "易宿酒店预订平台";
pptx.subject = "答辩PPT";
pptx.title = "易宿酒店预订平台答辩";
pptx.theme = {
  headFontFace: "Calibri",
  bodyFontFace: "Calibri Light",
  lang: "zh-CN"
};

const COLORS = {
  dark: "013A40",
  primary: "028090",
  secondary: "00A896",
  accent: "02C39A",
  light: "F5F7F7",
  text: "1F2D2E",
  muted: "5C6B6B",
  white: "FFFFFF"
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const addTitle = (slide, text) => {
  slide.addText(text, {
    x: 0.8,
    y: 0.5,
    w: SLIDE_W - 1.6,
    h: 0.7,
    fontSize: 40,
    bold: true,
    color: COLORS.text
  });
};

const addSectionHeader = (slide, text) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6,
    y: 0.45,
    w: 0.12,
    h: 0.6,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary }
  });
  slide.addText(text, {
    x: 0.9,
    y: 0.4,
    w: SLIDE_W - 1.5,
    h: 0.7,
    fontSize: 30,
    bold: true,
    color: COLORS.text
  });
};

const addCard = (slide, x, y, w, h, title, body) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.white },
    line: { color: "E3E8E8", width: 1 },
    radius: 0.1
  });
  slide.addText(title, {
    x: x + 0.3,
    y: y + 0.2,
    w: w - 0.6,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.text
  });
  slide.addText(body, {
    x: x + 0.3,
    y: y + 0.7,
    w: w - 0.6,
    h: h - 0.9,
    fontSize: 13,
    color: COLORS.muted,
    valign: "top"
  });
};

const titleSlide = pptx.addSlide();
titleSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.dark },
  line: { color: COLORS.dark }
});
titleSlide.addText("易宿酒店预订平台", {
  x: 0.9,
  y: 2.4,
  w: SLIDE_W - 1.8,
  h: 1,
  fontSize: 54,
  bold: true,
  color: COLORS.white
});
titleSlide.addText("答辩PPT · 业务、架构与实现综述", {
  x: 0.9,
  y: 3.6,
  w: SLIDE_W - 1.8,
  h: 0.6,
  fontSize: 20,
  color: "D7F4F1"
});
titleSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.9,
  y: 5.2,
  w: 4.6,
  h: 0.6,
  fill: { color: COLORS.primary },
  line: { color: COLORS.primary },
  radius: 0.1
});
titleSlide.addText("移动端 · 管理端 · 服务端", {
  x: 1.1,
  y: 5.3,
  w: 4.2,
  h: 0.4,
  fontSize: 14,
  color: COLORS.white
});

const agendaSlide = pptx.addSlide();
agendaSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addTitle(agendaSlide, "目录");
const agendaItems = [
  "项目概述与目标",
  "角色与业务范围",
  "核心功能拆分",
  "关键业务流程",
  "技术架构与数据模型",
  "工程规范与质量保障",
  "总结与下一步"
];
agendaItems.forEach((item, index) => {
  const y = 1.6 + index * 0.7;
  const label = `${String(index + 1).padStart(2, "0")}  ${item}`;
  agendaSlide.addText(label, {
    x: 1.0,
    y,
    w: 10.5,
    h: 0.4,
    fontSize: 18,
    color: COLORS.text
  });
});

const overviewSlide = pptx.addSlide();
overviewSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addSectionHeader(overviewSlide, "项目概述");
overviewSlide.addText(
  "易宿酒店预订平台连接商户与用户，提供酒店发布、审核、搜索、预订与订单管理的一体化系统。",
  {
    x: 0.9,
    y: 1.4,
    w: 6.6,
    h: 1.1,
    fontSize: 16,
    color: COLORS.text
  }
);
addCard(
  overviewSlide,
  0.9,
  2.6,
  3.8,
  3.2,
  "业务目标",
  "商户可在 PC 端发布房源，管理员完成审核；用户在移动端完成搜索、筛选、下单与支付。"
);
addCard(
  overviewSlide,
  4.9,
  2.6,
  3.8,
  3.2,
  "覆盖范围",
  "酒店信息管理、审核流程、订单创建、模拟支付、消息通知、收藏管理、预设数据与申请流程。"
);
addCard(
  overviewSlide,
  8.9,
  2.6,
  3.8,
  3.2,
  "范围外",
  "不接真实支付、退款售后、会员体系、点评系统，确保系统聚焦核心闭环。"
);
overviewSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.9,
  y: 6.1,
  w: 12,
  h: 0.7,
  fill: { color: COLORS.white },
  line: { color: "E3E8E8", width: 1 },
  radius: 0.08
});
overviewSlide.addText("得分点体现：功能完成度覆盖“发布-审核-查询-下单-支付-通知”完整闭环。", {
  x: 1.1,
  y: 6.2,
  w: 11.6,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const roleSlide = pptx.addSlide();
roleSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.white },
  line: { color: COLORS.white }
});
addSectionHeader(roleSlide, "角色与业务范围");
addCard(
  roleSlide,
  0.8,
  1.6,
  3.8,
  2.4,
  "C 端用户",
  "移动端查询、筛选、浏览酒店与房型，完成下单与支付。"
);
addCard(
  roleSlide,
  4.8,
  1.6,
  3.8,
  2.4,
  "商户",
  "PC 端录入酒店信息、房型与优惠，提交审核与运营管理。"
);
addCard(
  roleSlide,
  8.8,
  1.6,
  3.8,
  2.4,
  "管理员",
  "审核酒店上架/下架、管理商户与申请审核、维护平台秩序。"
);
roleSlide.addText("业务范围与边界", {
  x: 0.8,
  y: 4.3,
  w: 12,
  h: 0.4,
  fontSize: 18,
  bold: true,
  color: COLORS.text
});
roleSlide.addText(
  "覆盖酒店信息管理、审核流程、搜索展示、订单支付与消息通知；不覆盖真实支付接入、退款售后、会员体系与点评系统。",
  {
    x: 0.8,
    y: 4.8,
    w: 12,
    h: 1.2,
    fontSize: 14,
    color: COLORS.muted
  }
);

const featureSlide = pptx.addSlide();
featureSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addSectionHeader(featureSlide, "核心功能拆分");
featureSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.8,
  y: 1.6,
  w: 5.9,
  h: 5.3,
  fill: { color: COLORS.white },
  line: { color: "E3E8E8", width: 1 },
  radius: 0.12
});
featureSlide.addText("移动端（用户侧）", {
  x: 1.1,
  y: 1.8,
  w: 5.3,
  h: 0.4,
  fontSize: 18,
  bold: true,
  color: COLORS.text
});
featureSlide.addText(
  "首页查询与 Banner\n酒店列表筛选/排序/无限滚动\n酒店详情与房型预订\n订单列表与支付链路\n收藏与个人中心",
  {
    x: 1.1,
    y: 2.4,
    w: 5.2,
    h: 4,
    fontSize: 14,
    color: COLORS.muted
  }
);
featureSlide.addShape(pptx.ShapeType.roundRect, {
  x: 6.6,
  y: 1.6,
  w: 5.9,
  h: 5.3,
  fill: { color: COLORS.white },
  line: { color: "E3E8E8", width: 1 },
  radius: 0.12
});
featureSlide.addText("PC 管理端（商户/管理员）", {
  x: 6.9,
  y: 1.8,
  w: 5.3,
  h: 0.4,
  fontSize: 18,
  bold: true,
  color: COLORS.text
});
featureSlide.addText(
  "酒店录入与编辑\n审核流转与上下架\n工作台统计与批量操作\n消息中心与账户管理\n预设数据与申请审核",
  {
    x: 6.9,
    y: 2.4,
    w: 5.2,
    h: 4,
    fontSize: 14,
    color: COLORS.muted
  }
);
featureSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.8,
  y: 6.1,
  w: 11.7,
  h: 0.7,
  fill: { color: COLORS.white },
  line: { color: "E3E8E8", width: 1 },
  radius: 0.08
});
featureSlide.addText("得分点体现：功能完成度（移动端+管理端全链路）；用户体验（统一卡片与交互反馈）。", {
  x: 1.0,
  y: 6.2,
  w: 11.3,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const flowSlide = pptx.addSlide();
flowSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.white },
  line: { color: COLORS.white }
});
addSectionHeader(flowSlide, "关键业务流程");
const flowItems = [
  "商户录入酒店",
  "提交审核",
  "管理员审核",
  "用户浏览下单",
  "订单支付",
  "状态流转"
];
flowItems.forEach((item, index) => {
  const x = 0.6 + index * 2.1;
  flowSlide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: 2.4,
    w: 1.9,
    h: 1.0,
    fill: { color: COLORS.light },
    line: { color: "D7E2E1", width: 1 },
    radius: 0.08
  });
  flowSlide.addText(item, {
    x: x + 0.1,
    y: 2.55,
    w: 1.7,
    h: 0.8,
    fontSize: 12,
    color: COLORS.text,
    align: "center",
    valign: "mid"
  });
  if (index < flowItems.length - 1) {
    flowSlide.addShape(pptx.ShapeType.line, {
      x: x + 1.9,
      y: 2.9,
      w: 0.3,
      h: 0,
      line: { color: COLORS.secondary, width: 2, endArrowType: "triangle" }
    });
  }
});
flowSlide.addText("状态规则：pending → approved/rejected/offline，订单状态：pending_payment → confirmed → finished/cancelled。", {
  x: 0.8,
  y: 4.3,
  w: 12,
  h: 0.6,
  fontSize: 14,
  color: COLORS.muted
});
flowSlide.addText("得分点体现：流程完整性与状态约束，支撑功能完成度评分。", {
  x: 0.8,
  y: 5.0,
  w: 12,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const archSlide = pptx.addSlide();
archSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addSectionHeader(archSlide, "技术架构");
addCard(archSlide, 0.8, 1.6, 3.7, 2.2, "前端", "移动端：Taro + React\n管理端：React + Vite + Ant Design");
addCard(archSlide, 4.8, 1.6, 3.7, 2.2, "后端", "Node.js + Express\nRESTful API\nJWT 认证与角色鉴权");
addCard(archSlide, 8.8, 1.6, 3.7, 2.2, "数据层", "Supabase（PostgreSQL）\n地图服务（POI/地址解析）");
archSlide.addShape(pptx.ShapeType.line, {
  x: 2.65,
  y: 4.4,
  w: 3.1,
  h: 0,
  line: { color: COLORS.secondary, width: 2, endArrowType: "triangle" }
});
archSlide.addShape(pptx.ShapeType.line, {
  x: 6.65,
  y: 4.4,
  w: 3.1,
  h: 0,
  line: { color: COLORS.secondary, width: 2, endArrowType: "triangle" }
});
archSlide.addText("移动端与管理端统一走 API 网关，服务层负责库存、审核、通知与状态流转。", {
  x: 0.9,
  y: 4.8,
  w: 12,
  h: 0.7,
  fontSize: 14,
  color: COLORS.muted
});
archSlide.addText("得分点体现：前后端分离 + 鉴权 + 网关规则，体现技术复杂度。", {
  x: 0.9,
  y: 5.6,
  w: 12,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const modelSlide = pptx.addSlide();
modelSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.white },
  line: { color: COLORS.white }
});
addSectionHeader(modelSlide, "核心数据模型");
const modelCards = [
  ["User", "角色、账号、认证信息"],
  ["Hotel", "酒店信息、设施、图片、状态"],
  ["RoomType", "房型价格、库存、折扣、图片"],
  ["Order", "订单号、价格、入住日期、状态"],
  ["Request", "设施/房型/优惠/下架申请"],
  ["Notification", "消息通知与阅读状态"]
];
modelCards.forEach((item, index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = 0.8 + col * 4.2;
  const y = 1.7 + row * 2.5;
  addCard(modelSlide, x, y, 3.8, 2.1, item[0], item[1]);
});

const apiSlide = pptx.addSlide();
apiSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addSectionHeader(apiSlide, "API 设计要点");
apiSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.8,
  y: 1.6,
  w: 6.2,
  h: 5.2,
  fill: { color: COLORS.white },
  line: { color: "E3E8E8", width: 1 },
  radius: 0.12
});
apiSlide.addText(
  "• RESTful + JSON\n• 认证：Bearer Token\n• 分页：page/pageSize\n• 兼容旧结构与分页结构\n• 搜索排序规则明确\n• 订单状态与酒店状态强约束",
  {
    x: 1.2,
    y: 2.0,
    w: 5.4,
    h: 4.4,
    fontSize: 14,
    color: COLORS.muted,
    valign: "top"
  }
);
addCard(apiSlide, 7.4, 1.6, 5.1, 1.9, "示例接口", "GET /api/hotels\nPOST /api/hotels/:id/orders\nPATCH /api/admin/hotels/:id/status");
addCard(apiSlide, 7.4, 3.7, 5.1, 3.1, "关键规则", "仅 approved 酒店可展示；\n下单必须登录并校验入住日期；\n支付仅对 pending_payment 生效。");

const qualitySlide = pptx.addSlide();
qualitySlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.white },
  line: { color: COLORS.white }
});
addSectionHeader(qualitySlide, "工程规范与质量保障");
addCard(
  qualitySlide,
  0.8,
  1.6,
  3.8,
  4.8,
  "国际化体系",
  "namespace 拆分\n路由级懒加载\n双门禁校验\n占位符参数一致性"
);
addCard(
  qualitySlide,
  4.8,
  1.6,
  3.8,
  4.8,
  "性能优化",
  "首屏按需加载\n重组件下沉\n分页与延迟渲染\n优化台账沉淀"
);
addCard(
  qualitySlide,
  8.8,
  1.6,
  3.8,
  4.8,
  "测试策略",
  "Admin: vitest\nServer: jest + supertest\nMock 外部依赖\n覆盖认证/申请/通知"
);
qualitySlide.addText("得分点体现：工程规范 + 测试策略，支撑代码质量评分。", {
  x: 0.8,
  y: 6.6,
  w: 12,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const nonFunctionalSlide = pptx.addSlide();
nonFunctionalSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.light },
  line: { color: COLORS.light }
});
addSectionHeader(nonFunctionalSlide, "非功能要求");
const nfItems = [
  ["安全", "JWT 认证、角色鉴权、敏感操作校验"],
  ["性能", "路由级拆分、服务端分页、增量渲染"],
  ["可维护性", "分层架构、词典分域、统一复用规范"]
];
nfItems.forEach((item, index) => {
  const x = 0.9 + index * 4.15;
  nonFunctionalSlide.addShape(pptx.ShapeType.ellipse, {
    x: x + 1.35,
    y: 1.8,
    w: 1.1,
    h: 1.1,
    fill: { color: COLORS.secondary },
    line: { color: COLORS.secondary }
  });
  nonFunctionalSlide.addText(item[0], {
    x: x + 1.35,
    y: 2.05,
    w: 1.1,
    h: 0.6,
    fontSize: 16,
    color: COLORS.white,
    bold: true,
    align: "center",
    valign: "mid"
  });
  addCard(nonFunctionalSlide, x, 3.1, 3.7, 2.8, item[0], item[1]);
});
nonFunctionalSlide.addText("得分点体现：性能与可维护性要求，支撑技术复杂度与用户体验评分。", {
  x: 0.9,
  y: 6.4,
  w: 12,
  h: 0.5,
  fontSize: 14,
  color: COLORS.muted
});

const roadmapSlide = pptx.addSlide();
roadmapSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: COLORS.dark },
  line: { color: COLORS.dark }
});
roadmapSlide.addText("总结与下一步", {
  x: 0.9,
  y: 0.8,
  w: 12,
  h: 0.8,
  fontSize: 36,
  bold: true,
  color: COLORS.white
});
roadmapSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.9,
  y: 2.0,
  w: 11.8,
  h: 4.8,
  fill: { color: "0A4B52" },
  line: { color: "0A4B52" },
  radius: 0.12
});
roadmapSlide.addText(
  "Phase 2：拆分 audit/requests/merchants 等 namespace，完善路由映射\nPhase 2：引入伪本地化回归，提前发现文案溢出\nPhase 3：错误码体系标准化并接入 i18n 映射\nPhase 3：建立 locale 同源映射（i18n / Antd / Dayjs）",
  {
    x: 1.3,
    y: 2.5,
    w: 11,
    h: 3.8,
    fontSize: 16,
    color: "D7F4F1",
    valign: "top"
  }
);
roadmapSlide.addShape(pptx.ShapeType.roundRect, {
  x: 0.9,
  y: 5.9,
  w: 7.6,
  h: 0.6,
  fill: { color: COLORS.primary },
  line: { color: COLORS.primary },
  radius: 0.08
});
roadmapSlide.addText("得分点体现：i18n 门禁与性能台账，支撑项目创新性。", {
  x: 1.1,
  y: 6.0,
  w: 7.2,
  h: 0.4,
  fontSize: 13,
  color: COLORS.white
});
roadmapSlide.addText("感谢聆听", {
  x: 0.9,
  y: 6.5,
  w: 12,
  h: 0.6,
  fontSize: 20,
  color: COLORS.white
});

pptx.writeFile({ fileName: "i:/code/xiecheng/docs/答辩PPT_v4.pptx" });
