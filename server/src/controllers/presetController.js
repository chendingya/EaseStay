/**
 * 预设数据控制器
 */

const presetService = require('../services/presetService')

/**
 * 获取所有预设数据
 */
async function getAllPresets(req, res) {
  try {
    const presets = await presetService.getAllPresets()
    res.json({ success: true, data: presets })
  } catch (error) {
    console.error('获取预设数据失败:', error)
    res.status(500).json({ success: false, error: '获取预设数据失败' })
  }
}

/**
 * 获取预设设施列表
 */
async function getFacilities(req, res) {
  try {
    const data = await presetService.getPresetFacilities()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取设施列表失败:', error)
    res.status(500).json({ success: false, error: '获取设施列表失败' })
  }
}

/**
 * 获取预设房型列表
 */
async function getRoomTypes(req, res) {
  try {
    const data = await presetService.getPresetRoomTypes()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取房型列表失败:', error)
    res.status(500).json({ success: false, error: '获取房型列表失败' })
  }
}

/**
 * 获取预设优惠类型列表
 */
async function getPromotionTypes(req, res) {
  try {
    const data = await presetService.getPresetPromotionTypes()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取优惠类型列表失败:', error)
    res.status(500).json({ success: false, error: '获取优惠类型列表失败' })
  }
}

/**
 * 获取热门城市列表
 */
async function getHotCities(req, res) {
  try {
    const data = await presetService.getHotCities()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取热门城市失败:', error)
    res.status(500).json({ success: false, error: '获取热门城市失败' })
  }
}

/**
 * 获取所有城市列表
 */
async function getAllCities(req, res) {
  try {
    const data = await presetService.getAllCities()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取城市列表失败:', error)
    res.status(500).json({ success: false, error: '获取城市列表失败' })
  }
}

/**
 * 添加预设设施（管理员）
 */
async function addFacility(req, res) {
  try {
    const { name, category, icon } = req.body
    if (!name) {
      return res.status(400).json({ success: false, error: '设施名称不能为空' })
    }
    const data = await presetService.addPresetFacility(name, category, icon)
    res.json({ success: true, data })
  } catch (error) {
    console.error('添加设施失败:', error)
    res.status(500).json({ success: false, error: '添加设施失败' })
  }
}

/**
 * 添加预设房型（管理员）
 */
async function addRoomType(req, res) {
  try {
    const { name, defaultPrice, description, capacity, bedWidth, area, ceilingHeight, wifi, breakfastIncluded } = req.body
    if (!name || !defaultPrice) {
      return res.status(400).json({ success: false, error: '房型名称和价格不能为空' })
    }
    const data = await presetService.addPresetRoomType(name, defaultPrice, description, {
      capacity,
      bed_width: bedWidth,
      area,
      ceiling_height: ceilingHeight,
      wifi,
      breakfast_included: breakfastIncluded
    })
    res.json({ success: true, data })
  } catch (error) {
    console.error('添加房型失败:', error)
    res.status(500).json({ success: false, error: '添加房型失败' })
  }
}

/**
 * 添加预设优惠类型（管理员）
 */
async function addPromotionType(req, res) {
  try {
    const { type, label, description } = req.body
    if (!type || !label) {
      return res.status(400).json({ success: false, error: '优惠类型和标签不能为空' })
    }
    const data = await presetService.addPresetPromotionType(type, label, description)
    res.json({ success: true, data })
  } catch (error) {
    console.error('添加优惠类型失败:', error)
    res.status(500).json({ success: false, error: '添加优惠类型失败' })
  }
}

/**
 * 添加城市（管理员）
 */
async function addCity(req, res) {
  try {
    const { name, nameEn, province, isHot } = req.body
    if (!name) {
      return res.status(400).json({ success: false, error: '城市名称不能为空' })
    }
    const data = await presetService.addPresetCity(name, nameEn, province, isHot)
    res.json({ success: true, data })
  } catch (error) {
    console.error('添加城市失败:', error)
    res.status(500).json({ success: false, error: '添加城市失败' })
  }
}

module.exports = {
  getAllPresets,
  getFacilities,
  getRoomTypes,
  getPromotionTypes,
  getHotCities,
  getAllCities,
  addFacility,
  addRoomType,
  addPromotionType,
  addCity
}
