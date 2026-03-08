import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ownsStudent = (userId: string) => ({
  student: { family: { members: { some: { userId } } } },
})

const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'FIELD_TRIP', 'COOP_DAY'])

/**
 * @openapi
 * /attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Create or update an attendance record (upsert by studentId + date)
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, date, status]
 *             properties:
 *               studentId: {type: string, format: uuid}
 *               date: {type: string, format: date, example: '2025-09-01'}
 *               status: {type: string, enum: [PRESENT, ABSENT, HALF_DAY, FIELD_TRIP, COOP_DAY]}
 *               hours: {type: number, nullable: true}
 *               notes: {type: string, nullable: true}
 *     responses:
 *       201: {description: Attendance record saved}
 *       400: {description: Validation error}
 *       404: {description: Student not found}
 */
const upsertAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  date: z.coerce.date(),
  status: attendanceStatusEnum,
  hours: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const result = upsertAttendanceSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { studentId, date, status, hours, notes } = result.data

  const student = await prisma.student.findFirst({
    where: { id: studentId, family: { members: { some: { userId: req.user!.id } } } },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const record = await prisma.attendanceRecord.upsert({
    where: { studentId_date: { studentId, date } },
    create: { studentId, date, status, hours, notes },
    update: { status, hours, notes },
  })
  res.status(201).json(record)
})

/**
 * @openapi
 * /attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: List attendance records with optional filters
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: studentId, schema: {type: string, format: uuid}}
 *       - {in: query, name: startDate, schema: {type: string, format: date}}
 *       - {in: query, name: endDate, schema: {type: string, format: date}}
 *     responses:
 *       200: {description: List of attendance records}
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, startDate, endDate } = req.query

  const where: Record<string, unknown> = { ...ownsStudent(req.user!.id) }
  if (studentId) where.studentId = studentId as string
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    where.date = dateFilter
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    orderBy: { date: 'desc' },
  })
  res.json(records)
})

/**
 * @openapi
 * /attendance/{id}:
 *   put:
 *     tags: [Attendance]
 *     summary: Update an attendance record
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Record updated}
 *       404: {description: Record not found}
 */
const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum.optional(),
  hours: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updateAttendanceSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.attendanceRecord.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

  const record = await prisma.attendanceRecord.update({
    where: { id: req.params.id },
    data: result.data,
  })
  res.json(record)
})

/**
 * @openapi
 * /attendance/{id}:
 *   delete:
 *     tags: [Attendance]
 *     summary: Delete an attendance record
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Record deleted}
 *       404: {description: Record not found}
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.attendanceRecord.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

  await prisma.attendanceRecord.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
