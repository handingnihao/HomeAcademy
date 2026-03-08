import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * @openapi
 * /compliance/states:
 *   get:
 *     tags: [Compliance]
 *     summary: List all seeded state requirements
 *     responses:
 *       200: {description: List of state requirements}
 */
router.get('/states', async (_req, res: Response) => {
  const states = await prisma.stateRequirement.findMany({ orderBy: { stateName: 'asc' } })
  res.json(states)
})

/**
 * @openapi
 * /compliance/states/{stateCode}:
 *   get:
 *     tags: [Compliance]
 *     summary: Get requirements for a specific state
 *     parameters:
 *       - {in: path, name: stateCode, required: true, schema: {type: string, example: TN}}
 *     responses:
 *       200: {description: State requirements}
 *       404: {description: State not found}
 */
router.get('/states/:stateCode', async (req, res: Response) => {
  const state = await prisma.stateRequirement.findUnique({
    where: { stateCode: req.params.stateCode.toUpperCase() },
  })
  if (!state) return res.status(404).json({ error: 'State requirement not found' })
  res.json(state)
})

/**
 * @openapi
 * /compliance/{familyId}:
 *   get:
 *     tags: [Compliance]
 *     summary: Get compliance status for a family against their state's requirements
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: familyId, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Compliance status per student}
 *       404: {description: Family not found}
 */
router.get('/:familyId', requireAuth, async (req: Request, res: Response) => {
  const { familyId } = req.params

  const family = await prisma.family.findFirst({
    where: { id: familyId, members: { some: { userId: req.user!.id } } },
    include: {
      students: {
        include: {
          subjects: { where: { isActive: true } },
        },
      },
    },
  })
  if (!family) return res.status(404).json({ error: 'Family not found' })

  const stateReq = await prisma.stateRequirement.findUnique({
    where: { stateCode: family.state },
  })

  // Count school-year attendance days per student (all non-absent statuses count)
  const attendanceCounts = await Promise.all(
    family.students.map(async (student) => {
      const count = await prisma.attendanceRecord.count({
        where: {
          studentId: student.id,
          date: { gte: family.schoolYearStart, lte: family.schoolYearEnd },
          status: { in: ['PRESENT', 'HALF_DAY', 'FIELD_TRIP', 'COOP_DAY'] },
        },
      })
      return { studentId: student.id, daysPresent: count }
    })
  )

  const requiredSubjects = (stateReq?.requiredSubjects as string[] | null) ?? null

  const students = family.students.map((student) => {
    const daysPresent = attendanceCounts.find((a) => a.studentId === student.id)?.daysPresent ?? 0
    const requiredDays = stateReq?.requiredDays ?? null
    const activeSubjectNames = student.subjects.map((s) => s.name)

    const missingSubjects = requiredSubjects
      ? requiredSubjects.filter(
          (req) => !activeSubjectNames.some((s) => s.toLowerCase().includes(req.toLowerCase()))
        )
      : []

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      daysPresent,
      requiredDays,
      daysCompliant: requiredDays === null || daysPresent >= requiredDays,
      activeSubjects: activeSubjectNames,
      missingSubjects,
      subjectsCompliant: missingSubjects.length === 0,
    }
  })

  res.json({
    familyId: family.id,
    familyName: family.name,
    state: family.state,
    schoolYearStart: family.schoolYearStart,
    schoolYearEnd: family.schoolYearEnd,
    stateRequirement: stateReq,
    students,
  })
})

export default router
