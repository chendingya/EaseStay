const express = require('express')
const cors = require('cors')
const path = require('path')
const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const { apiRouter, statusRoutes } = require('./routes')
const { health } = require('./controllers/statusController')
const swaggerDefinition = require('./swaggerDefinition')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [path.join(__dirname, 'routes', '*.js')]
})

app.get('/health', health)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/status', statusRoutes)
app.use('/api', apiRouter)

module.exports = app
