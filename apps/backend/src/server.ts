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
import subjectRoutes from './routes/subjects'
import attendanceRoutes from './routes/attendance'
import lessonRoutes from './routes/lessons'
import gradeRoutes from './routes/grades'
import complianceRoutes from './routes/compliance'
import reportRoutes from './routes/reports'
import coopRoutes from './routes/coop'

app.use('/api/auth', authRoutes)
app.use('/api/families', familyRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/compliance', complianceRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/coop', coopRoutes)

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
