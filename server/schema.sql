-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('merchant', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 酒店表
CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  merchant_id INT NOT NULL REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  star_rating INT DEFAULT 0 CHECK (star_rating >= 0 AND star_rating <= 5),
  opening_time VARCHAR(50),
  description TEXT,
  facilities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  nearby_attractions JSONB DEFAULT '[]',
  nearby_transport JSONB DEFAULT '[]',
  nearby_malls JSONB DEFAULT '[]',
  promotions JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'offline')),
  reject_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 房型表
CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 短信验证码表（临时存储）
CREATE TABLE sms_codes (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- 申请审核表（设施/房型/优惠申请）
CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  merchant_id INT NOT NULL REFERENCES users(id),
  hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('facility', 'room_type', 'promotion')),
  name VARCHAR(200) NOT NULL,
  data JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知消息表
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  related_id INT,
  related_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 预设数据表 ==========

-- 预设设施表
CREATE TABLE preset_facilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(100),
  category VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预设房型表
CREATE TABLE preset_room_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  default_price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预设优惠类型表
CREATE TABLE preset_promotion_types (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 热门城市表
CREATE TABLE preset_cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100),
  province VARCHAR(100),
  is_hot BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 初始化预设数据 ==========

-- 初始化预设设施
INSERT INTO preset_facilities (name, category, sort_order) VALUES
  ('免费WiFi', '基础服务', 1),
  ('免费停车', '基础服务', 2),
  ('游泳池', '休闲娱乐', 3),
  ('健身房', '休闲娱乐', 4),
  ('餐厅', '餐饮服务', 5),
  ('会议室', '商务服务', 6),
  ('洗衣服务', '基础服务', 7),
  ('24小时前台', '基础服务', 8),
  ('行李寄存', '基础服务', 9),
  ('接机服务', '交通服务', 10),
  ('商务中心', '商务服务', 11),
  ('SPA', '休闲娱乐', 12),
  ('儿童乐园', '休闲娱乐', 13),
  ('宠物友好', '特色服务', 14),
  ('无烟客房', '客房服务', 15),
  ('残疾人设施', '特色服务', 16),
  ('电动车充电', '交通服务', 17),
  ('自助洗衣', '基础服务', 18)
ON CONFLICT (name) DO NOTHING;

-- 初始化预设房型
INSERT INTO preset_room_types (name, default_price, sort_order) VALUES
  ('标准双床房', 299, 1),
  ('标准大床房', 329, 2),
  ('豪华大床房', 399, 3),
  ('豪华双床房', 429, 4),
  ('商务套房', 599, 5),
  ('行政套房', 799, 6),
  ('总统套房', 1299, 7),
  ('亲子房', 499, 8),
  ('家庭房', 569, 9)
ON CONFLICT (name) DO NOTHING;

-- 初始化预设优惠类型
INSERT INTO preset_promotion_types (type, label, sort_order) VALUES
  ('early_bird', '早鸟优惠', 1),
  ('weekend', '周末特惠', 2),
  ('long_stay', '连住优惠', 3),
  ('member', '会员专享', 4),
  ('festival', '节日优惠', 5),
  ('package', '套餐优惠', 6)
ON CONFLICT (type) DO NOTHING;

-- 初始化热门城市
INSERT INTO preset_cities (name, province, is_hot, sort_order) VALUES
  ('上海', '上海市', TRUE, 1),
  ('北京', '北京市', TRUE, 2),
  ('广州', '广东省', TRUE, 3),
  ('深圳', '广东省', TRUE, 4),
  ('杭州', '浙江省', TRUE, 5),
  ('成都', '四川省', TRUE, 6),
  ('重庆', '重庆市', TRUE, 7),
  ('西安', '陕西省', TRUE, 8),
  ('苏州', '江苏省', TRUE, 9),
  ('南京', '江苏省', TRUE, 10),
  ('武汉', '湖北省', TRUE, 11),
  ('长沙', '湖南省', TRUE, 12),
  ('青岛', '山东省', TRUE, 13),
  ('厦门', '福建省', TRUE, 14),
  ('三亚', '海南省', TRUE, 15),
  ('丽江', '云南省', TRUE, 16)
ON CONFLICT (name) DO NOTHING;

-- 创建索引提升查询性能
CREATE INDEX idx_hotels_merchant_id ON hotels(merchant_id);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_room_types_hotel_id ON room_types(hotel_id);
CREATE INDEX idx_sms_codes_username ON sms_codes(username);
CREATE INDEX idx_requests_merchant_id ON requests(merchant_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 启用 RLS（行级安全）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_promotion_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_cities ENABLE ROW LEVEL SECURITY;

-- ========== RLS 策略配置 ==========
-- 注意：由于我们使用自定义 JWT 认证（而非 Supabase Auth），
-- 后端使用 service_role key 绑过 RLS，这里的策略主要用于防止匿名直接访问

-- users 表：仅允许通过后端 API 访问
CREATE POLICY "users_no_anon_select" ON users FOR SELECT USING (false);
CREATE POLICY "users_no_anon_insert" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "users_no_anon_update" ON users FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "users_no_anon_delete" ON users FOR DELETE USING (false);

-- hotels 表：公开可读已审核酒店，禁止匿名写入
CREATE POLICY "hotels_public_read" ON hotels FOR SELECT USING (status = 'approved');
CREATE POLICY "hotels_no_anon_insert" ON hotels FOR INSERT WITH CHECK (false);
CREATE POLICY "hotels_no_anon_update" ON hotels FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "hotels_no_anon_delete" ON hotels FOR DELETE USING (false);

-- room_types 表：公开可读关联已审核酒店的房型，禁止匿名写入
CREATE POLICY "room_types_public_read" ON room_types
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM hotels WHERE hotels.id = room_types.hotel_id AND hotels.status = 'approved')
  );
CREATE POLICY "room_types_no_anon_insert" ON room_types FOR INSERT WITH CHECK (false);
CREATE POLICY "room_types_no_anon_update" ON room_types FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "room_types_no_anon_delete" ON room_types FOR DELETE USING (false);

-- sms_codes 表：禁止匿名访问
CREATE POLICY "sms_codes_no_anon_select" ON sms_codes FOR SELECT USING (false);
CREATE POLICY "sms_codes_no_anon_insert" ON sms_codes FOR INSERT WITH CHECK (false);
CREATE POLICY "sms_codes_no_anon_update" ON sms_codes FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "sms_codes_no_anon_delete" ON sms_codes FOR DELETE USING (false);

-- requests 表：禁止匿名访问
CREATE POLICY "requests_no_anon_select" ON requests FOR SELECT USING (false);
CREATE POLICY "requests_no_anon_insert" ON requests FOR INSERT WITH CHECK (false);
CREATE POLICY "requests_no_anon_update" ON requests FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "requests_no_anon_delete" ON requests FOR DELETE USING (false);

-- notifications 表：禁止匿名访问
CREATE POLICY "notifications_no_anon_select" ON notifications FOR SELECT USING (false);
CREATE POLICY "notifications_no_anon_insert" ON notifications FOR INSERT WITH CHECK (false);
CREATE POLICY "notifications_no_anon_update" ON notifications FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "notifications_no_anon_delete" ON notifications FOR DELETE USING (false);

-- 预设数据表：公开可读，禁止匿名写入
CREATE POLICY "preset_facilities_public_read" ON preset_facilities FOR SELECT USING (is_active = true);
CREATE POLICY "preset_facilities_no_anon_insert" ON preset_facilities FOR INSERT WITH CHECK (false);
CREATE POLICY "preset_facilities_no_anon_update" ON preset_facilities FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "preset_facilities_no_anon_delete" ON preset_facilities FOR DELETE USING (false);

CREATE POLICY "preset_room_types_public_read" ON preset_room_types FOR SELECT USING (is_active = true);
CREATE POLICY "preset_room_types_no_anon_insert" ON preset_room_types FOR INSERT WITH CHECK (false);
CREATE POLICY "preset_room_types_no_anon_update" ON preset_room_types FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "preset_room_types_no_anon_delete" ON preset_room_types FOR DELETE USING (false);

CREATE POLICY "preset_promotion_types_public_read" ON preset_promotion_types FOR SELECT USING (is_active = true);
CREATE POLICY "preset_promotion_types_no_anon_insert" ON preset_promotion_types FOR INSERT WITH CHECK (false);
CREATE POLICY "preset_promotion_types_no_anon_update" ON preset_promotion_types FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "preset_promotion_types_no_anon_delete" ON preset_promotion_types FOR DELETE USING (false);

CREATE POLICY "preset_cities_public_read" ON preset_cities FOR SELECT USING (is_active = true);
CREATE POLICY "preset_cities_no_anon_insert" ON preset_cities FOR INSERT WITH CHECK (false);
CREATE POLICY "preset_cities_no_anon_update" ON preset_cities FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "preset_cities_no_anon_delete" ON preset_cities FOR DELETE USING (false);