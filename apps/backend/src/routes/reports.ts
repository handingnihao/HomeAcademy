import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ownsStudent = (userId: string) => ({
  family: { members: { some: { userId } } },
})

const letterGrade = (avg: number): string =>
  avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F'

/**
 * @openapi
 * /reports/attendance/{studentId}:
 *   get:
 *     tags: [Reports]
 *     summary: Attendance summary report for a student
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: studentId, required: true, schema: {type: string, format: uuid}}
 *       - {in: query, name: startDate, schema: {type: string, format: date}}
 *       - {in: query, name: endDate, schema: {type: string, format: date}}
 *     responses:
 *       200: {description: Attendance report data}
 *       404: {description: Student not found}
 */
router.get('/attendance/:studentId', requireAuth, async (req: Request, res: Response) => {
  const { studentId } = req.params
  const { startDate, endDate } = req.query

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...ownsStudent(req.user!.id) },
    include: { family: true },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const dateFilter: Record<string, Date> = {}
  if (startDate) dateFilter.gte = new Date(startDate as string)
  if (endDate) dateFilter.lte = new Date(endDate as string)

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    },
    orderBy: { date: 'asc' },
  })

  const statusCounts = records.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<string, number>
  )
  const totalHours = records.reduce((sum, r) => sum + (r.hours ?? 0), 0)

  res.json({
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      family: student.family.name,
    },
    period: { startDate: startDate ?? null, endDate: endDate ?? null },
    summary: {
      totalDays: records.length,
      statusCounts,
      totalHours: totalHours > 0 ? totalHours : null,
    },
    records,
  })
})

/**
 * @openapi
 * /reports/grades/{studentId}:
 *   get:
 *     tags: [Reports]
 *     summary: Grade summary report for a student
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: studentId, required: true, schema: {type: string, format: uuid}}
 *     responses:
 *       200: {description: Grade report data with overall average and letter grade}
 *       404: {description: Student not found}
 */
router.get('/grades/:studentId', requireAuth, async (req: Request, res: Response) => {
  const { studentId } = req.params

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...ownsStudent(req.user!.id) },
    include: {
      family: true,
      subjects: { where: { isActive: true } },
    },
  })
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const grades = await prisma.grade.findMany({
    where: { studentId },
    include: {
      scheduledLesson: {
        include: { lessonPlan: { include: { subject: { select: { id: true, name: true } } } } },
      },
    },
    orderBy: { gradedAt: 'asc' },
  })

  const totalWeightedScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * g.weight, 0)
  const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0)
  const overallAverage = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : null

  res.json({
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      family: student.family.name,
    },
    summary: {
      totalAssignments: grades.length,
      overallAverage: overallAverage !== null ? Math.round(overallAverage * 100) / 100 : null,
      letterGrade: overallAverage !== null ? letterGrade(overallAverage) : null,
    },
    grades,
  })
})

export default router
