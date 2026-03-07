import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import { logger } from './utils/logger'
import { swaggerSpec } from './config/swagger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HomeAcademy API Docs',
}))

import authRoutes from './routes/auth'
import familyRoutes from './routes/families'
import studentRoutes from './routes/students'

app.use('/api/auth', authRoutes)
app.use('/api/families', familyRoutes)
app.use('/api/students', studentRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🏫 HomeAcademy backend running on port ${PORT}`)
  })
}

export default app
