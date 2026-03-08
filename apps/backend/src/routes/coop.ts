import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// ── Co-op Classes ──────────────────────────────────────────────

/**
 * @openapi
 * /coop/classes:
 *   post:
 *     tags: [Co-op]
 *     summary: Create a co-op class (you become the instructor)
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: {type: string}
 *               description: {type: string}
 *               schedule: {type: string, example: 'Tuesdays 10am'}
 *     responses:
 *       201: {description: Co-op class created}
 */
const createClassSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schedule: z.string().optional(),
})

router.post('/classes', requireAuth, async (req: Request, res: Response) => {
  const result = createClassSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const coopClass = await prisma.coopClass.create({
    data: { ...result.data, instructorId: req.user!.id },
    include: {
      instructor: { select: { id: true, email: true } },
      _count: { select: { enrollments: true } },
    },
  })
  res.status(201).json(coopClass)
})

/**
 * @openapi
 * /coop/classes:
 *   get:
 *     tags: [Co-op]
 *     summary: List all active co-op classes
 *     security: [{bearerAuth: []}]
 *     responses:
 *       200: {description: List of active co-op classes}
 */
router.get('/classes', requireAuth, async (_req, res: Response) => {
  const classes = await prisma.coopClass.findMany({
    where: { isActive: true },
    include: {
      instructor: { select: { id: true, email: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: 'asc' },
  })
  res.json(classes)
})

/**
 * @openapi
 * /coop/classes/{id}:
 *   get:
 *     tags: [Co-op]
 *     summary: Get a co-op class with its enrollments
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Co-op class details}
 *       404: {description: Not found}
 */
router.get('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  const coopClass = await prisma.coopClass.findUnique({
    where: { id: req.params.id },
    include: {
      instructor: { select: { id: true, email: true } },
      enrollments: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, gradeLevel: true } },
          family: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!coopClass) return res.status(404).json({ error: 'Co-op class not found' })
  res.json(coopClass)
})

/**
 * @openapi
 * /coop/classes/{id}:
 *   put:
 *     tags: [Co-op]
 *     summary: Update a co-op class (instructor only)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Class updated}
 *       403: {description: Not the instructor}
 *       404: {description: Not found}
 */
const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  schedule: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

router.put('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  const result = updateClassSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const existing = await prisma.coopClass.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Co-op class not found' })
  if (existing.instructorId !== req.user!.id) {
    return res.status(403).json({ error: 'Only the instructor can update this class' })
  }

  const coopClass = await prisma.coopClass.update({
    where: { id: req.params.id },
    data: result.data,
    include: {
      instructor: { select: { id: true, email: true } },
      _count: { select: { enrollments: true } },
    },
  })
  res.json(coopClass)
})

/**
 * @openapi
 * /coop/classes/{id}:
 *   delete:
 *     tags: [Co-op]
 *     summary: Delete a co-op class (instructor only)
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Deleted}
 *       403: {description: Not the instructor}
 *       404: {description: Not found}
 */
router.delete('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  const existing = await prisma.coopClass.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Co-op class not found' })
  if (existing.instructorId !== req.user!.id) {
    return res.status(403).json({ error: 'Only the instructor can delete this class' })
  }

  await prisma.coopClass.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// ── Enrollments ────────────────────────────────────────────────

/**
 * @openapi
 * /coop/enrollments:
 *   post:
 *     tags: [Co-op]
 *     summary: Enroll a student in a co-op class
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coopClassId, studentId, familyId]
 *             properties:
 *               coopClassId: {type: string, format: uuid}
 *               studentId: {type: string, format: uuid}
 *               familyId: {type: string, format: uuid}
 *     responses:
 *       201: {description: Student enrolled}
 *       403: {description: Not a member of this family}
 *       404: {description: Student or class not found}
 */
const enrollSchema = z.object({
  coopClassId: z.string().uuid(),
  studentId: z.string().uuid(),
  familyId: z.string().uuid(),
})

router.post('/enrollments', requireAuth, async (req: Request, res: Response) => {
  const result = enrollSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.errors })

  const { coopClassId, studentId, familyId } = result.data

  const family = await prisma.family.findFirst({
    where: { id: familyId, members: { some: { userId: req.user!.id } } },
  })
  if (!family) return res.status(403).json({ error: 'Not a member of this family' })

  const student = await prisma.student.findFirst({ where: { id: studentId, familyId } })
  if (!student) return res.status(404).json({ error: 'Student not found in this family' })

  const coopClass = await prisma.coopClass.findUnique({ where: { id: coopClassId } })
  if (!coopClass) return res.status(404).json({ error: 'Co-op class not found' })

  const enrollment = await prisma.coopEnrollment.create({
    data: { coopClassId, studentId, familyId },
    include: {
      coopClass: true,
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  res.status(201).json(enrollment)
})

/**
 * @openapi
 * /coop/enrollments/{id}:
 *   delete:
 *     tags: [Co-op]
 *     summary: Unenroll a student from a co-op class
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       204: {description: Unenrolled}
 *       404: {description: Enrollment not found}
 */
router.delete('/enrollments/:id', requireAuth, async (req: Request, res: Response) => {
  const enrollment = await prisma.coopEnrollment.findFirst({
    where: {
      id: req.params.id,
      family: { members: { some: { userId: req.user!.id } } },
    },
  })
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' })

  await prisma.coopEnrollment.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
