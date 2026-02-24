const http = require('http')
const https = require('https')
const sharp = require('sharp')

const MAX_SIZE = 2000
const MIN_QUALITY = 40
const MAX_QUALITY = 90
const DEFAULT_QUALITY = 70

const normalizeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getAllowedHosts = () => {
  // 默认允许所有域名，除非明确设置为 'false'
  const allowAll = process.env.IMAGE_PROXY_ALLOW_ALL !== 'false'
  if (allowAll) {
    return { allowAll: true, allowedHosts: new Set() }
  }
  const hostList = String(process.env.IMAGE_PROXY_ALLOW_HOSTS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (process.env.SUPABASE_URL) {
    try {
      const host = new URL(process.env.SUPABASE_URL).hostname
      if (host) hostList.push(host)
    } catch (error) {}
  }
  return { allowAll: false, allowedHosts: new Set(hostList) }
}

const isAllowedHost = (hostname, allowAll, allowedHosts) => {
  if (allowAll) return true
  if (allowedHosts.size === 0) return true
  return allowedHosts.has(hostname)
}

const fetchBuffer = (url, depth = 0) => new Promise((resolve, reject) => {
  if (depth > 3) {
    reject(new Error('Too many redirects'))
    return
  }
  const client = url.startsWith('https') ? https : http
  const req = client.get(url, (res) => {
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      resolve(fetchBuffer(res.headers.location, depth + 1))
      return
    }
    if (res.statusCode !== 200) {
      reject(new Error(`Image fetch failed: ${res.statusCode}`))
      return
    }
    const chunks = []
    res.on('data', (chunk) => chunks.push(chunk))
    res.on('end', () => resolve(Buffer.concat(chunks)))
  })
  req.on('error', reject)
  req.setTimeout(10000, () => {
    req.destroy(new Error('Image fetch timeout'))
  })
})

const proxyImage = async (req, res) => {
  const rawUrl = req.query?.url
  if (!rawUrl) {
    res.status(400).json({ message: 'url required' })
    return
  }
  let parsedUrl
  try {
    parsedUrl = new URL(rawUrl)
  } catch (error) {
    res.status(400).json({ message: 'invalid url' })
    return
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    res.status(400).json({ message: 'invalid protocol' })
    return
  }
  const { allowAll, allowedHosts } = getAllowedHosts()
  if (!isAllowedHost(parsedUrl.hostname, allowAll, allowedHosts)) {
    res.status(403).json({ message: 'host not allowed' })
    return
  }
  const widthValue = normalizeNumber(req.query?.w)
  const heightValue = normalizeNumber(req.query?.h)
  const qualityValue = normalizeNumber(req.query?.q)
  const width = widthValue ? clamp(widthValue, 1, MAX_SIZE) : null
  const height = heightValue ? clamp(heightValue, 1, MAX_SIZE) : null
  const quality = clamp(qualityValue || DEFAULT_QUALITY, MIN_QUALITY, MAX_QUALITY)
  const formatParam = String(req.query?.fmt || '').toLowerCase()
  const format = formatParam === 'png' ? 'png' : formatParam === 'jpeg' || formatParam === 'jpg' ? 'jpeg' : 'webp'
  try {
    const inputBuffer = await fetchBuffer(parsedUrl.toString())
    let pipeline = sharp(inputBuffer, { failOnError: false })
    if (width || height) {
      pipeline = pipeline.resize(width || null, height || null, {
        fit: width && height ? 'cover' : 'inside',
        withoutEnlargement: true
      })
    }
    if (format === 'png') {
      pipeline = pipeline.png({ quality })
      res.type('image/png')
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
      res.type('image/jpeg')
    } else {
      pipeline = pipeline.webp({ quality })
      res.type('image/webp')
    }
    const outputBuffer = await pipeline.toBuffer()
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.status(200).send(outputBuffer)
  } catch (error) {
    res.status(502).json({ message: 'image proxy failed' })
  }
}

module.exports = {
  proxyImage
}
