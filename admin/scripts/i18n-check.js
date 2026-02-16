import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const srcDir = path.join(cwd, 'src')
const zhLocaleDir = path.join(srcDir, 'locales', 'zh-CN')
const enLocaleDir = path.join(srcDir, 'locales', 'en-US')
const reportFile = path.join(cwd, 'i18n-report.json')
const todoFile = path.join(cwd, 'i18n-todo.json')

const strict = process.argv.includes('--strict')
const strictKeys = strict || process.argv.includes('--strict-keys')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {}
      }
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

function loadLocale(localeDir) {
  const jsonFiles = fs
    .readdirSync(localeDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)

  const namespaceFiles = jsonFiles.filter((name) => name !== 'translation.json')
  const filesToLoad = namespaceFiles.length > 0 ? namespaceFiles : ['translation.json']

  const merged = {}
  for (const file of filesToLoad) {
    const dict = readJson(path.join(localeDir, file))
    deepMerge(merged, dict)
  }

  return merged
}

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj || {})) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, next))
    } else {
      keys.push(next)
    }
  }
  return keys
}

function walkFiles(dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (fullPath.includes(path.join('src', 'locales'))) continue
      if (entry.name === '__tests__' || entry.name === 'tests') continue
      result.push(...walkFiles(fullPath))
      continue
    }

    if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue
    if (/(\.test|\.spec)\.(js|jsx|ts|tsx)$/.test(entry.name)) continue
    result.push(fullPath)
  }
  return result
}

function scanHardcodedChinese(files) {
  const matches = []
  const literalRe = /(['"`])(?:\\.|(?!\1).)*[\u4e00-\u9fff](?:\\.|(?!\1).)*\1/g

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split(/\r?\n/)
    lines.forEach((line, idx) => {
      const text = line.trim()
      if (!text || text.startsWith('//') || text.startsWith('*') || text.startsWith('/*')) return
      if (!literalRe.test(line)) {
        literalRe.lastIndex = 0
        return
      }
      literalRe.lastIndex = 0

      matches.push({
        file: path.relative(cwd, file),
        line: idx + 1,
        code: text.slice(0, 220)
      })
    })
  }

  return matches
}

const zh = loadLocale(zhLocaleDir)
const en = loadLocale(enLocaleDir)
const zhKeys = new Set(flattenKeys(zh))
const enKeys = new Set(flattenKeys(en))

const zhOnly = [...zhKeys].filter((k) => !enKeys.has(k))
const enOnly = [...enKeys].filter((k) => !zhKeys.has(k))

const codeFiles = walkFiles(srcDir)
const hardcoded = scanHardcodedChinese(codeFiles)

const report = {
  generatedAt: new Date().toISOString(),
  locales: {
    zhKeys: zhKeys.size,
    enKeys: enKeys.size,
    zhOnlyCount: zhOnly.length,
    enOnlyCount: enOnly.length,
    zhOnlySample: zhOnly.slice(0, 50),
    enOnlySample: enOnly.slice(0, 50)
  },
  hardcoded: {
    fileCount: codeFiles.length,
    lineCount: hardcoded.length,
    sample: hardcoded.slice(0, 120)
  }
}

fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
fs.writeFileSync(todoFile, `${JSON.stringify(hardcoded, null, 2)}\n`, 'utf8')

const hasKeyMismatch = zhOnly.length > 0 || enOnly.length > 0
const hasHardcoded = hardcoded.length > 0

console.log(`i18n report written: ${path.relative(cwd, reportFile)}`)
console.log(`i18n todo written:   ${path.relative(cwd, todoFile)}`)
console.log(`locale keys: zh=${zhKeys.size}, en=${enKeys.size}`)
console.log(`key mismatch: zhOnly=${zhOnly.length}, enOnly=${enOnly.length}`)
console.log(`hardcoded Chinese lines (non-test): ${hardcoded.length}`)

if (hasKeyMismatch && strictKeys) {
  console.error('i18n check failed: locale keys are inconsistent.')
  process.exit(1)
}

if (hasHardcoded && strict) {
  console.error('i18n check failed: hardcoded Chinese literals found.')
  process.exit(1)
}

