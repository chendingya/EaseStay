require('dotenv').config()

const app = require('./app')

const PORT = process.env.PORT || 4100
const HOST = process.env.HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`Yisu server running on http://${HOST}:${PORT}`)
})
