/**
 * 用户管理控制器
 */

const supabase = require('../config/supabase')
const { hashPassword, verifyPassword } = require('../middleware/auth')

/**
 * 获取当前用户信息
 */
async function getCurrentUser(req, res) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json(user)
  } catch (err) {
    console.error('获取用户信息失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 修改密码
 */
async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '请填写原密码和新密码' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码至少6位' })
  }

  try {
    // 获取当前用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 验证原密码
    const match = await verifyPassword(oldPassword, user.password_hash)
    if (!match) {
      return res.status(400).json({ message: '原密码错误' })
    }

    // 更新密码
    const newHash = await hashPassword(newPassword)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.user.id)

    if (updateError) {
      return res.status(500).json({ message: '修改密码失败' })
    }

    res.json({ message: '密码修改成功' })
  } catch (err) {
    console.error('修改密码失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 获取所有商户列表（仅管理员）
 */
async function getMerchants(req, res) {
  try {
    const { data: merchants, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('role', 'merchant')
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ message: '获取商户列表失败' })
    }

    // 获取每个商户的酒店数量
    const merchantsWithStats = await Promise.all(
      merchants.map(async (merchant) => {
        const { count: hotelCount } = await supabase
          .from('hotels')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)

        const { count: approvedCount } = await supabase
          .from('hotels')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .eq('status', 'approved')

        return {
          ...merchant,
          hotelCount: hotelCount || 0,
          approvedCount: approvedCount || 0
        }
      })
    )

    res.json(merchantsWithStats)
  } catch (err) {
    console.error('获取商户列表失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 获取单个商户详情（仅管理员）
 */
async function getMerchantDetail(req, res) {
  const { id } = req.params

  try {
    const { data: merchant, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('id', id)
      .eq('role', 'merchant')
      .single()

    if (error || !merchant) {
      return res.status(404).json({ message: '商户不存在' })
    }

    // 获取商户的酒店列表
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id, name, city, status, created_at')
      .eq('merchant_id', id)
      .order('created_at', { ascending: false })

    res.json({
      ...merchant,
      hotels: hotels || []
    })
  } catch (err) {
    console.error('获取商户详情失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 重置商户密码（仅管理员）
 */
async function resetMerchantPassword(req, res) {
  const { id } = req.params
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: '新密码至少6位' })
  }

  try {
    // 确认是商户
    const { data: merchant, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'merchant')
      .single()

    if (error || !merchant) {
      return res.status(404).json({ message: '商户不存在' })
    }

    // 更新密码
    const newHash = await hashPassword(newPassword)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ message: '重置密码失败' })
    }

    res.json({ message: '密码重置成功' })
  } catch (err) {
    console.error('重置密码失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

module.exports = {
  getCurrentUser,
  changePassword,
  getMerchants,
  getMerchantDetail,
  resetMerchantPassword
}
