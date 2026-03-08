import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ownsStudent = (userId: string) => ({
  student: { family: { members: { some: { userId } } } },
})

/**
 * @openapi
 * /subjects:
 *   post:
 *     tags: [Subjects]
 *     summary: Create a subject for a student
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, name]
 *             properties:
 *               studentId: {type: string, format: uuid}
 *               name: {type: string, example: Math}
 *               color: {type: string, example: '#6366f1'}
 *               curriculumName: {type: string, example: Saxon Math 5/4}
 *     responses:
 *       201: {description: Subject created}
 *       400: {description: Validation error}
 *       404: {description: Student not found}
 */
const createSubjectSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  curriculumName: z.string().optional(),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const result = createSubjectSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { studentId, name, color, curriculumName } = result.data

  const student = await prisma.student.findFirst({
    where: { id: studentId, family: { members: { some: { userId: req.user!.id } } } },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const subject = await prisma.subject.create({
    data: { studentId, name, ...(color && { color }), curriculumName },
  })
  res.status(201).json(subject)
})

/**
 * @openapi
 * /subjects:
 *   get:
 *     tags: [Subjects]
 *     summary: List subjects (optionally filter by studentId)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: studentId, schema: {type: string, format: uuid}}
 *       - {in: query, name: includeInactive, schema: {type: boolean}}
 *     responses:
 *       200: {description: List of subjects}
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, includeInactive } = req.query

  const subjects = await prisma.subject.findMany({
    where: {
      ...(studentId && { studentId: studentId as string }),
      ...(includeInactive !== 'true' && { isActive: true }),
      ...ownsStudent(req.user!.id),
    },
    include: { _count: { select: { lessonPlans: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(subjects)
})

/**
 * @openapi
 * /subjects/{id}:
 *   get:
 *     tags: [Subjects]
 *     summary: Get a subject with its lesson plans
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Subject details}
 *       404: {description: Subject not found}
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const subject = await prisma.subject.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
    include: { lessonPlans: { orderBy: { createdAt: 'desc' } } },
  })
  if (!subject) return res.status(404).json({ error: 'Subject not found' })
  res.json(subject)
})

/**
 * @openapi
 * /subjects/{id}:
 *   put:
 *     tags: [Subjects]
 *     summary: Update a subject
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: {type: string}
 *               color: {type: string}
 *               curriculumName: {type: string, nullable: true}
 *               isActive: {type: boolean}
 *     responses:
 *       200: {description: Subject updated}
 *       404: {description: Subject not found}
 */
const updateSubjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  curriculumName: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updateSubjectSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.subject.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Subject not found' })

  const subject = await prisma.subject.update({ where: { id: req.params.id }, data: result.data })
  res.json(subject)
})

/**
 * @openapi
 * /subjects/{id}:
 *   delete:
 *     tags: [Subjects]
 *     summary: Delete a subject
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Subject deleted}
 *       404: {description: Subject not found}
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.subject.findFirst({
    where: { id: req.params.id, ...ownsStudent(req.user!.id) },
  })
  if (!existing) return res.status(404).json({ error: 'Subject not found' })

  await prisma.subject.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
