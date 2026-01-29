/**
 * 预设数据服务
 * 提供设施、房型、优惠类型、城市等预设数据的查询
 */

const supabase = require('../config/supabase')

/**
 * 获取所有预设设施
 */
async function getPresetFacilities() {
  const { data, error } = await supabase
    .from('preset_facilities')
    .select('id, name, icon, category')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 获取所有预设房型
 */
async function getPresetRoomTypes() {
  const { data, error } = await supabase
    .from('preset_room_types')
    .select('id, name, default_price, description')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 获取所有预设优惠类型
 */
async function getPresetPromotionTypes() {
  const { data, error } = await supabase
    .from('preset_promotion_types')
    .select('id, type, label, description')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 获取热门城市
 */
async function getHotCities() {
  const { data, error } = await supabase
    .from('preset_cities')
    .select('id, name, name_en, province')
    .eq('is_active', true)
    .eq('is_hot', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 获取所有城市
 */
async function getAllCities() {
  const { data, error } = await supabase
    .from('preset_cities')
    .select('id, name, name_en, province, is_hot')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 获取所有预设数据（合并接口）
 */
async function getAllPresets() {
  const [facilities, roomTypes, promotionTypes, cities] = await Promise.all([
    getPresetFacilities(),
    getPresetRoomTypes(),
    getPresetPromotionTypes(),
    getHotCities()
  ])

  return {
    facilities,
    roomTypes,
    promotionTypes,
    cities
  }
}

/**
 * 添加新预设设施（管理员）
 */
async function addPresetFacility(name, category, icon) {
  const { data, error } = await supabase
    .from('preset_facilities')
    .insert({ name, category, icon })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 添加新预设房型（管理员）
 */
async function addPresetRoomType(name, defaultPrice, description) {
  const { data, error } = await supabase
    .from('preset_room_types')
    .insert({ name, default_price: defaultPrice, description })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 添加新预设优惠类型（管理员）
 */
async function addPresetPromotionType(type, label, description) {
  const { data, error } = await supabase
    .from('preset_promotion_types')
    .insert({ type, label, description })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 添加新城市（管理员）
 */
async function addPresetCity(name, nameEn, province, isHot) {
  const { data, error } = await supabase
    .from('preset_cities')
    .insert({ name, name_en: nameEn, province, is_hot: isHot })
    .select()
    .single()

  if (error) throw error
  return data
}

module.exports = {
  getPresetFacilities,
  getPresetRoomTypes,
  getPresetPromotionTypes,
  getHotCities,
  getAllCities,
  getAllPresets,
  addPresetFacility,
  addPresetRoomType,
  addPresetPromotionType,
  addPresetCity
}
