const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// 使用 service_role key 绑过 RLS（用于后端 API 操作）
// 如果没有配置 service_role key，则回退到 anon key（开发环境）
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 公开客户端（用于公开查询，受 RLS 限制）
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

module.exports = supabase
module.exports.supabasePublic = supabasePublic
