const supabase = require('../config/supabase')

const createCode = () => String(Math.floor(100000 + Math.random() * 900000))

const getTarget = ({ phone, username } = {}) => String(phone || username || '').trim()

const sendCode = async ({ phone, username }) => {
  const target = getTarget({ phone, username })
  if (!target) {
    return { ok: false, message: 'phone 或 username 为必填项' }
  }

  const code = createCode()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // 删除旧的验证码
  await supabase.from('sms_codes').delete().eq('username', target)

  // 插入新验证码
  const { error } = await supabase.from('sms_codes').insert({
    username: target,
    code,
    expires_at: expiresAt
  })

  if (error) {
    return { ok: false, message: '验证码发送失败' }
  }

  return { ok: true, code, expiresAt }
}

const verifyCode = async ({ phone, username, code }) => {
  const target = getTarget({ phone, username })
  if (!target) {
    return { ok: false, message: 'phone 或 username 为必填项' }
  }

  const { data: record, error } = await supabase
    .from('sms_codes')
    .select('*')
    .eq('username', target)
    .single()

  if (error || !record) {
    return { ok: false, message: '验证码不存在或已过期' }
  }

  if (new Date() > new Date(record.expires_at)) {
    await supabase.from('sms_codes').delete().eq('username', target)
    return { ok: false, message: '验证码已过期' }
  }

  if (record.code !== code) {
    return { ok: false, message: '验证码错误' }
  }

  await supabase.from('sms_codes').delete().eq('username', target)
  return { ok: true }
}

module.exports = {
  sendCode,
  verifyCode
}
