/**
 * 用户管理控制器
 */

const supabase = require('../config/supabase')
const { hashPassword, verifyPassword } = require('../middleware/auth')

const buildHotelMapByOrders = async (orders = []) => {
  const hotelIds = [...new Set((orders || [])
    .map((item) => item?.hotel_id)
    .filter((item) => item !== undefined && item !== null && String(item).trim() !== ''))]

  if (hotelIds.length === 0) return {}

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, name_en, city, address, images, star_rating, opening_time')
    .in('id', hotelIds)

  return (hotels || []).reduce((acc, item) => {
    acc[String(item.id)] = item
    return acc
  }, {})
}

const buildHotelMapByIds = async (hotelIds = []) => {
  const ids = [...new Set((hotelIds || []).filter((item) => item !== undefined && item !== null && String(item).trim() !== ''))]
  if (ids.length === 0) return {}

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, name_en, city, address, images, star_rating, opening_time')
    .in('id', ids)

  return (hotels || []).reduce((acc, item) => {
    acc[String(item.id)] = item
    return acc
  }, {})
}

const enrichOrder = (order, hotelMap = {}) => {
  const hotel = hotelMap[String(order.hotel_id)] || null
  const hotelName = String(hotel?.name || order?.hotel_name || '').trim()
  const hotelNameEn = String(hotel?.name_en || order?.hotel_name_en || '').trim()
  return {
    ...order,
    hotel,
    hotel_name: hotelName,
    hotel_name_en: hotelNameEn
  }
}

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
 * 获取当前用户订单（移动端）
 */
async function getMyOrders(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const pageSize = Math.max(Number(req.query.pageSize) || 10, 1)
  const status = String(req.query.status || '').trim()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  try {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error, count } = await query.range(from, to)
    if (error) {
      return res.status(500).json({ message: '获取订单失败：' + error.message })
    }

    const hotelMap = await buildHotelMapByOrders(orders || [])
    const list = (orders || []).map((order) => enrichOrder(order, hotelMap))

    res.json({
      page,
      pageSize,
      total: count || 0,
      list
    })
  } catch (err) {
    console.error('获取用户订单失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 获取单个订单详情（移动端）
 */
async function getMyOrderDetail(req, res) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: '订单ID不合法' })
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (error || !order) {
      return res.status(404).json({ message: '订单不存在' })
    }

    const hotelMap = await buildHotelMapByOrders([order])
    res.json(enrichOrder(order, hotelMap))
  } catch (err) {
    console.error('获取订单详情失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

/**
 * 支付订单（模拟）
 */
async function payOrder(req, res) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: '订单ID不合法' })
  }

  try {
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (findError || !order) {
      return res.status(404).json({ message: '订单不存在' })
    }

    if (order.status !== 'pending_payment') {
      return res.status(400).json({ message: '当前订单无需支付' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        paid_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      return res.status(500).json({ message: '支付失败：' + (updateError?.message || '更新失败') })
    }

    const hotelMap = await buildHotelMapByOrders([updated])
    res.json(enrichOrder(updated, hotelMap))
  } catch (err) {
    console.error('支付订单失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function cancelOrder(req, res) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: '订单ID不合法' })
  }

  try {
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (findError || !order) {
      return res.status(404).json({ message: '订单不存在' })
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ message: '当前订单不可取消' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      return res.status(500).json({ message: '取消失败：' + (updateError?.message || '更新失败') })
    }

    const hotelMap = await buildHotelMapByOrders([updated])
    res.json(enrichOrder(updated, hotelMap))
  } catch (err) {
    console.error('取消订单失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function useOrder(req, res) {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: '订单ID不合法' })
  }

  try {
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (findError || !order) {
      return res.status(404).json({ message: '订单不存在' })
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ message: '当前订单不可使用' })
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'finished',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single()

    if (updateError || !updated) {
      return res.status(500).json({ message: '使用失败：' + (updateError?.message || '更新失败') })
    }

    const hotelMap = await buildHotelMapByOrders([updated])
    res.json(enrichOrder(updated, hotelMap))
  } catch (err) {
    console.error('使用订单失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function getMyFavorites(req, res) {
  try {
    const { data: favorites, error } = await supabase
      .from('favorite_hotels')
      .select('id, hotel_id, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ message: '获取收藏失败：' + error.message })
    }

    const hotelIds = (favorites || []).map((item) => item.hotel_id)
    const hotelMap = await buildHotelMapByIds(hotelIds)
    const list = (favorites || []).map((item) => {
      const hotel = hotelMap[String(item.hotel_id)] || {}
      return {
        ...hotel,
        id: hotel?.id ?? item.hotel_id,
        savedAt: item.created_at
      }
    })

    res.json({ list })
  } catch (err) {
    console.error('获取收藏失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function getFavoriteStatus(req, res) {
  const hotelId = Number(req.params.hotelId)
  if (!Number.isFinite(hotelId)) {
    return res.status(400).json({ message: '酒店ID不合法' })
  }

  try {
    const { data, error } = await supabase
      .from('favorite_hotels')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('hotel_id', hotelId)

    if (error) {
      return res.status(500).json({ message: '获取收藏状态失败：' + error.message })
    }

    res.json({ collected: Array.isArray(data) && data.length > 0 })
  } catch (err) {
    console.error('获取收藏状态失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function addFavorite(req, res) {
  const hotelId = Number(req.body.hotelId)
  if (!Number.isFinite(hotelId)) {
    return res.status(400).json({ message: '酒店ID不合法' })
  }

  try {
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id')
      .eq('id', hotelId)
      .single()

    if (hotelError || !hotel) {
      return res.status(404).json({ message: '酒店不存在' })
    }

    const { data: existing, error: findError } = await supabase
      .from('favorite_hotels')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('hotel_id', hotelId)

    if (findError) {
      return res.status(500).json({ message: '收藏失败：' + findError.message })
    }

    if (Array.isArray(existing) && existing.length > 0) {
      return res.json({ collected: true })
    }

    const { error: insertError } = await supabase
      .from('favorite_hotels')
      .insert({ user_id: req.user.id, hotel_id: hotelId })

    if (insertError) {
      return res.status(500).json({ message: '收藏失败：' + insertError.message })
    }

    res.json({ collected: true })
  } catch (err) {
    console.error('收藏失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function removeFavorite(req, res) {
  const hotelId = Number(req.params.hotelId)
  if (!Number.isFinite(hotelId)) {
    return res.status(400).json({ message: '酒店ID不合法' })
  }

  try {
    const { error } = await supabase
      .from('favorite_hotels')
      .delete()
      .eq('user_id', req.user.id)
      .eq('hotel_id', hotelId)

    if (error) {
      return res.status(500).json({ message: '取消收藏失败：' + error.message })
    }

    res.json({ collected: false })
  } catch (err) {
    console.error('取消收藏失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
}

async function clearFavorites(req, res) {
  try {
    const { error } = await supabase
      .from('favorite_hotels')
      .delete()
      .eq('user_id', req.user.id)

    if (error) {
      return res.status(500).json({ message: '清空收藏失败：' + error.message })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('清空收藏失败:', err)
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
  getMyOrders,
  getMyOrderDetail,
  payOrder,
  cancelOrder,
  useOrder,
  getMyFavorites,
  getFavoriteStatus,
  addFavorite,
  removeFavorite,
  clearFavorites,
  getMerchants,
  getMerchantDetail,
  resetMerchantPassword
}
