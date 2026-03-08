import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ownsStudent = (userId: string) => ({
  student: { family: { members: { some: { userId } } } },
})

const letterGrade = (avg: number): string =>
  avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F'

/**
 * @openapi
 * /grades:
 *   post:
 *     tags: [Grades]
 *     summary: Record a grade for a student
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, assignmentTitle, score]
 *             properties:
 *               studentId: {type: string, format: uuid}
 *               assignmentTitle: {type: string}
 *               score: {type: number, minimum: 0}
 *               maxScore: {type: number, default: 100}
 *               weight: {type: number, default: 1.0}
 *               scheduledLessonId: {type: string, format: uuid}
 *               notes: {type: string}
 *     responses:
 *       201: {description: Grade recorded}
 *       404: {description: Student not found}
 */
const createGradeSchema = z.object({
  studentId: z.string().uuid(),
  assignmentTitle: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  scheduledLessonId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const result = createGradeSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { studentId, assignmentTitle, score, maxScore, weight, scheduledLessonId, notes } = result.data

  const student = await prisma.student.findFirst({
    where: { id: studentId, family: { members: { some: { userId: req.user!.id } } } },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const grade = await prisma.grade.create({
    data: {
      studentId,
      assignmentTitle,
      score,
      ...(maxScore !== undefined && { maxScore }),
      ...(weight !== undefined && { weight }),
      scheduledLessonId,
      notes,
    },
  })
  res.status(201).json(grade)
})

/**
 * @openapi
 * /grades:
 *   get:
 *     tags: [Grades]
 *     summary: List grades (optionally filter by studentId)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: studentId, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: List of grades}
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId } = req.query

  const grades = await prisma.grade.findMany({
    where: {
      ...(studentId && { studentId: studentId as string }),
      ...ownsStudent(req.user!.id),
    },
    include: {
      scheduledLesson: { select: { id: true, title: true } },
    },
    orderBy: { gradedAt: 'desc' },
  })
  res.json(grades)
})

/**
 * @openapi
 * /grades/summary/{studentId}:
 *   get:
 *     tags: [Grades]
 *     summary: Get grade summary and GPA for a student
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: studentId, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Grade summary with weighted average and letter grade}
 *       404: {description: Student not found}
 */
router.get('/summary/:studentId', requireAuth, async (req: Request, res: Response) => {
  const { studentId } = req.params

  const student = await prisma.student.findFirst({
    where: { id: studentId, family: { members: { some: { userId: req.user!.id } } } },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const grades = await prisma.grade.findMany({
    where: { studentId },
    orderBy: { gradedAt: 'desc' },
  })

  const totalWeightedScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * g.weight, 0)
  const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0)
  const average = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : null

  res.json({
    studentId,
    totalAssignments: grades.length,
    average: average !== null ? Math.round(average * 100) / 100 : null,
    letterGrade: average !== null ? letterGrade(average) : null,
    grades,
  })
})

/**
 * @openapi
 * /grades/{id}:
 *   put:
 *     tags: [Grades]
 *     summary: Update a grade
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Grade updated}
 *       404: {description: Grade not found}
 */
const updateGradeSchema = z.object({
  assignmentTitle: z.string().min(1).optional(),
  score: z.number().min(0).optional(),
  maxScore: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updateGradeSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.grade.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Grade not found' })

  const grade = await prisma.grade.update({ where: { id: req.params.id }, data: result.data })
  res.json(grade)
})

/**
 * @openapi
 * /grades/{id}:
 *   delete:
 *     tags: [Grades]
 *     summary: Delete a grade
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Grade deleted}
 *       404: {description: Grade not found}
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.grade.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Grade not found' })

  await prisma.grade.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
