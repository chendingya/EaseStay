const fs = require('fs')
const path = require('path')

for (const lng of ['zh-CN', 'en-US']) {
  const dir = path.join(__dirname, '..', 'admin', 'src', 'locales', lng)
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json') || file === 'translation.json') continue
    const ns = file.replace(/\.json$/, '')
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    if (!(ns in content)) {
      console.log(`${lng}/${file} missing root "${ns}", top keys: ${Object.keys(content).slice(0, 5).join(', ')}`)
    }
  }
}
