import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * @openapi
 * /students:
 *   post:
 *     tags:
 *       - Students
 *     summary: Create a new student
 *     description: Create a student in a family (user must be a member of the family)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - familyId
 *               - firstName
 *               - lastName
 *               - gradeLevel
 *             properties:
 *               familyId:
 *                 type: string
 *                 format: uuid
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Smith
 *               gradeLevel:
 *                 type: string
 *                 example: "5"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2014-03-15
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional user account for student login
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a member of this family
 *       404:
 *         description: Family not found
 */

const createStudentSchema = z.object({
  familyId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gradeLevel: z.string(),
  dateOfBirth: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const result = createStudentSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors })
  }

  const { familyId, firstName, lastName, gradeLevel, dateOfBirth, userId } = result.data

  // Check if user is a member of the family
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
  })

  if (!family) {
    return res.status(403).json({ error: 'Not a member of this family' })
  }

  const student = await prisma.student.create({
    data: {
      familyId,
      firstName,
      lastName,
      gradeLevel,
      dateOfBirth,
      userId,
    },
  })

  res.status(201).json(student)
})

/**
 * @openapi
 * /students:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get all students for user's families
 *     description: Returns all students from families the user is a member of
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: familyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific family ID
 *     responses:
 *       200:
 *         description: List of students
 *       401:
 *         description: Unauthorized
 */

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { familyId } = req.query

  const where: any = {
    family: {
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
  }

  if (familyId) {
    where.familyId = familyId as string
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      family: {
        select: {
          id: true,
          name: true,
          state: true,
        },
      },
      _count: {
        select: {
          subjects: true,
          attendanceRecords: true,
          grades: true,
        },
      },
    },
    orderBy: [
      { family: { name: 'asc' } },
      { firstName: 'asc' },
    ],
  })

  res.json(students)
})

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get a specific student by ID
 *     description: Returns student details if user is a member of the family
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Student details
 *       403:
 *         description: Not authorized to view this student
 *       404:
 *         description: Student not found
 */

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  const student = await prisma.student.findFirst({
    where: {
      id,
      family: {
        members: {
          some: {
            userId: req.user!.id,
          },
        },
      },
    },
    include: {
      family: true,
      subjects: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
      _count: {
        select: {
          attendanceRecords: true,
          grades: true,
          scheduledLessons: true,
        },
      },
    },
  })

  if (!student) {
    return res.status(404).json({ error: 'Student not found' })
  }

  res.json(student)
})

/**
 * @openapi
 * /students/{id}:
 *   put:
 *     tags:
 *       - Students
 *     summary: Update a student
 *     description: Update student details (user must be a member of the family)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               gradeLevel:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       403:
 *         description: Not authorized to update this student
 *       404:
 *         description: Student not found
 */

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gradeLevel: z.string().optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const result = updateStudentSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.errors })
  }

  // Check if user is a member of the student's family
  const existingStudent = await prisma.student.findFirst({
    where: {
      id,
      family: {
        members: {
          some: {
            userId: req.user!.id,
          },
        },
      },
    },
  })

  if (!existingStudent) {
    return res.status(404).json({ error: 'Student not found' })
  }

  const student = await prisma.student.update({
    where: { id },
    data: result.data,
    include: {
      family: true,
      subjects: true,
    },
  })

  res.json(student)
})

/**
 * @openapi
 * /students/{id}:
 *   delete:
 *     tags:
 *       - Students
 *     summary: Delete a student
 *     description: Delete a student and all related data (user must be a member of the family)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Student deleted successfully
 *       403:
 *         description: Not authorized to delete this student
 *       404:
 *         description: Student not found
 */

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  // Check if user is a member of the student's family
  const existingStudent = await prisma.student.findFirst({
    where: {
      id,
      family: {
        members: {
          some: {
            userId: req.user!.id,
          },
        },
      },
    },
  })

  if (!existingStudent) {
    return res.status(404).json({ error: 'Student not found' })
  }

  await prisma.student.delete({
    where: { id },
  })

  res.status(204).send()
})

export default router
