import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ownsStudent = (userId: string) => ({
  student: { family: { members: { some: { userId } } } },
})

const ownsPlan = (userId: string) => ({
  subject: { student: { family: { members: { some: { userId } } } } },
})

// ── Lesson Plans ───────────────────────────────────────────────

/**
 * @openapi
 * /lessons/plans:
 *   post:
 *     tags: [Lessons]
 *     summary: Create a lesson plan for a subject
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjectId, title]
 *             properties:
 *               subjectId: {type: string, format: uuid}
 *               title: {type: string}
 *               description: {type: string}
 *               materials: {type: string}
 *               estimatedMinutes: {type: integer, default: 60}
 *     responses:
 *       201: {description: Lesson plan created}
 *       404: {description: Subject not found}
 */
const createPlanSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  materials: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
})

router.post('/plans', requireAuth, async (req: Request, res: Response) => {
  const result = createPlanSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { subjectId, title, description, materials, estimatedMinutes } = result.data

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, student: { family: { members: { some: { userId: req.user!.id } } } } },
  })
  if (!subject) return res.status(404).json({ error: 'Subject not found' })

  const plan = await prisma.lessonPlan.create({
    data: { subjectId, title, description, materials, ...(estimatedMinutes && { estimatedMinutes }) },
  })
  res.status(201).json(plan)
})

/**
 * @openapi
 * /lessons/plans:
 *   get:
 *     tags: [Lessons]
 *     summary: List lesson plans (optionally filter by subjectId)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: subjectId, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: List of lesson plans}
 */
router.get('/plans', requireAuth, async (req: Request, res: Response) => {
  const { subjectId } = req.query

  const plans = await prisma.lessonPlan.findMany({
    where: {
      ...(subjectId && { subjectId: subjectId as string }),
      ...ownsPlan(req.user!.id),
    },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      _count: { select: { scheduledLessons: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(plans)
})

/**
 * @openapi
 * /lessons/plans/{id}:
 *   get:
 *     tags: [Lessons]
 *     summary: Get a lesson plan with its scheduled instances
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Lesson plan details}
 *       404: {description: Not found}
 */
router.get('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  const plan = await prisma.lessonPlan.findFirst({
    where: { id: req.params.id, ...ownsPlan(req.user!.id) },
    include: {
      subject: true,
      scheduledLessons: { orderBy: { scheduledDate: 'desc' } },
    },
  })
  if (!plan) return res.status(404).json({ error: 'Lesson plan not found' })
  res.json(plan)
})

/**
 * @openapi
 * /lessons/plans/{id}:
 *   put:
 *     tags: [Lessons]
 *     summary: Update a lesson plan
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Lesson plan updated}
 *       404: {description: Not found}
 */
const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  materials: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional(),
})

router.put('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updatePlanSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.lessonPlan.findFirst({
    where: { id: req.params.id, ...ownsPlan(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Lesson plan not found' })

  const plan = await prisma.lessonPlan.update({ where: { id: req.params.id }, data: result.data })
  res.json(plan)
})

/**
 * @openapi
 * /lessons/plans/{id}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Delete a lesson plan
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Deleted}
 *       404: {description: Not found}
 */
router.delete('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.lessonPlan.findFirst({
    where: { id: req.params.id, ...ownsPlan(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Lesson plan not found' })

  await prisma.lessonPlan.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ── Scheduled Lessons ──────────────────────────────────────────

/**
 * @openapi
 * /lessons/scheduled:
 *   post:
 *     tags: [Lessons]
 *     summary: Schedule a lesson for a student
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, title, scheduledDate]
 *             properties:
 *               studentId: {type: string, format: uuid}
 *               title: {type: string}
 *               scheduledDate: {type: string, format: date}
 *               lessonPlanId: {type: string, format: uuid}
 *               notes: {type: string}
 *               isCoopLesson: {type: boolean, default: false}
 *     responses:
 *       201: {description: Lesson scheduled}
 *       404: {description: Student not found}
 */
const createScheduledSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().min(1),
  scheduledDate: z.coerce.date(),
  lessonPlanId: z.string().uuid().optional(),
  notes: z.string().optional(),
  isCoopLesson: z.boolean().optional(),
})

router.post('/scheduled', requireAuth, async (req: Request, res: Response) => {
  const result = createScheduledSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { studentId, title, scheduledDate, lessonPlanId, notes, isCoopLesson } = result.data

  const student = await prisma.student.findFirst({
    where: { id: studentId, family: { members: { some: { userId: req.user!.id } } } },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const lesson = await prisma.scheduledLesson.create({
    data: {
      studentId,
      title,
      scheduledDate,
      lessonPlanId,
      notes,
      ...(isCoopLesson !== undefined && { isCoopLesson }),
    },
  })
  res.status(201).json(lesson)
})

/**
 * @openapi
 * /lessons/scheduled:
 *   get:
 *     tags: [Lessons]
 *     summary: List scheduled lessons with optional filters
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: studentId, schema: {type: string, format: uuid}}
 *       - {in: query, name: startDate, schema: {type: string, format: date}}
 *       - {in: query, name: endDate, schema: {type: string, format: date}}
 *       - {in: query, name: status, schema: {type: string, enum: [SCHEDULED, COMPLETED, SKIPPED, RESCHEDULED]}}
 *     responses:
 *       200: {description: List of scheduled lessons}
 */
router.get('/scheduled', requireAuth, async (req: Request, res: Response) => {
  const { studentId, startDate, endDate, status } = req.query

  const where: Record<string, unknown> = { ...ownsStudent(req.user!.id) }
  if (studentId) where.studentId = studentId as string
  if (status) where.status = status as string
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    where.scheduledDate = dateFilter
  }

  const lessons = await prisma.scheduledLesson.findMany({
    where,
    include: {
      lessonPlan: {
        select: { id: true, title: true, subject: { select: { id: true, name: true, color: true } } },
      },
    },
    orderBy: { scheduledDate: 'asc' },
  })
  res.json(lessons)
})

/**
 * @openapi
 * /lessons/scheduled/{id}:
 *   get:
 *     tags: [Lessons]
 *     summary: Get a scheduled lesson with its grades
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Scheduled lesson details}
 *       404: {description: Not found}
 */
router.get('/scheduled/:id', requireAuth, async (req: Request, res: Response) => {
  const lesson = await prisma.scheduledLesson.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
    include: { lessonPlan: true, grades: true },
  })
  if (!lesson) return res.status(404).json({ error: 'Scheduled lesson not found' })
  res.json(lesson)
})

/**
 * @openapi
 * /lessons/scheduled/{id}:
 *   put:
 *     tags: [Lessons]
 *     summary: Update a scheduled lesson (e.g. mark complete)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: {type: string}
 *               scheduledDate: {type: string, format: date}
 *               status: {type: string, enum: [SCHEDULED, COMPLETED, SKIPPED, RESCHEDULED]}
 *               completedAt: {type: string, format: date-time, nullable: true}
 *               notes: {type: string, nullable: true}
 *     responses:
 *       200: {description: Lesson updated}
 *       404: {description: Not found}
 */
const updateScheduledSchema = z.object({
  title: z.string().min(1).optional(),
  scheduledDate: z.coerce.date().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'SKIPPED', 'RESCHEDULED']).optional(),
  completedAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.put('/scheduled/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updateScheduledSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.scheduledLesson.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Scheduled lesson not found' })

  const data = { ...result.data }
  // Auto-set completedAt when marking as COMPLETED
  if (data.status === 'COMPLETED' && data.completedAt === undefined) {
    data.completedAt = new Date()
  }

  const lesson = await prisma.scheduledLesson.update({ where: { id: req.params.id }, data })
  res.json(lesson)
})

/**
 * @openapi
 * /lessons/scheduled/{id}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Delete a scheduled lesson
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Deleted}
 *       404: {description: Not found}
 */
router.delete('/scheduled/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.scheduledLesson.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Scheduled lesson not found' })

  await prisma.scheduledLesson.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
