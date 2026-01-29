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

-- 创建索引提升查询性能
CREATE INDEX idx_hotels_merchant_id ON hotels(merchant_id);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_room_types_hotel_id ON room_types(hotel_id);
CREATE INDEX idx_sms_codes_username ON sms_codes(username);

-- 启用 RLS（行级安全）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_codes ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户访问（因为我们使用自定义 JWT 认证）
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to hotels" ON hotels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to room_types" ON room_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sms_codes" ON sms_codes FOR ALL USING (true) WITH CHECK (true);