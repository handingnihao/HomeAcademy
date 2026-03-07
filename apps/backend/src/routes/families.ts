import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * @openapi
 * /families:
 *   post:
 *     tags:
 *       - Families
 *     summary: Create a new family
 *     description: Create a new family and automatically add the authenticated user as a parent member
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - state
 *               - schoolYearStart
 *               - schoolYearEnd
 *             properties:
 *               name:
 *                 type: string
 *                 example: Smith Family Homeschool
 *               state:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 2
 *                 example: TN
 *               schoolYearStart:
 *                 type: string
 *                 format: date
 *                 example: 2024-08-01
 *               schoolYearEnd:
 *                 type: string
 *                 format: date
 *                 example: 2025-05-31
 *     responses:
 *       201:
 *         description: Family created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

const createFamilySchema = z.object({
  name: z.string().min(1),
  state: z.string().length(2).toUpperCase(),
  schoolYearStart: z.coerce.date(),
  schoolYearEnd: z.coerce.date(),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const result = createFamilySchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors })
  }

  const { name, state, schoolYearStart, schoolYearEnd } = result.data

  const family = await prisma.family.create({
    data: {
      name,
      state,
      schoolYearStart,
      schoolYearEnd,
      members: {
        create: {
          userId: req.user!.id,
          role: 'PARENT',
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  })

  res.status(201).json(family)
})

/**
 * @openapi
 * /families:
 *   get:
 *     tags:
 *       - Families
 *     summary: Get all families for authenticated user
 *     description: Returns all families the authenticated user is a member of
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of families
 *       401:
 *         description: Unauthorized
 */

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const families = await prisma.family.findMany({
    where: {
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
      students: {
        orderBy: {
          firstName: 'asc',
        },
      },
      _count: {
        select: {
          students: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  res.json(families)
})

/**
 * @openapi
 * /families/{id}:
 *   get:
 *     tags:
 *       - Families
 *     summary: Get a specific family by ID
 *     description: Returns family details if user is a member
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
 *         description: Family details
 *       403:
 *         description: Not a member of this family
 *       404:
 *         description: Family not found
 */

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  const family = await prisma.family.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
      students: {
        orderBy: {
          firstName: 'asc',
        },
      },
    },
  })

  if (!family) {
    return res.status(404).json({ error: 'Family not found' })
  }

  res.json(family)
})

/**
 * @openapi
 * /families/{id}:
 *   put:
 *     tags:
 *       - Families
 *     summary: Update a family
 *     description: Update family details (user must be a member)
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
 *               name:
 *                 type: string
 *               state:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 2
 *               schoolYearStart:
 *                 type: string
 *                 format: date
 *               schoolYearEnd:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Family updated successfully
 *       403:
 *         description: Not a member of this family
 *       404:
 *         description: Family not found
 */

const updateFamilySchema = z.object({
  name: z.string().min(1).optional(),
  state: z.string().length(2).toUpperCase().optional(),
  schoolYearStart: z.coerce.date().optional(),
  schoolYearEnd: z.coerce.date().optional(),
})

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const result = updateFamilySchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({ error: result.error.errors })
  }

  // Check if user is a member
  const existingFamily = await prisma.family.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
  })

  if (!existingFamily) {
    return res.status(404).json({ error: 'Family not found' })
  }

  const family = await prisma.family.update({
    where: { id },
    data: result.data,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },
      students: true,
    },
  })

  res.json(family)
})

/**
 * @openapi
 * /families/{id}:
 *   delete:
 *     tags:
 *       - Families
 *     summary: Delete a family
 *     description: Delete a family and all related data (user must be a member)
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
 *         description: Family deleted successfully
 *       403:
 *         description: Not a member of this family
 *       404:
 *         description: Family not found
 */

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  // Check if user is a member
  const existingFamily = await prisma.family.findFirst({
    where: {
      id,
      members: {
        some: {
          userId: req.user!.id,
        },
      },
    },
  })

  if (!existingFamily) {
    return res.status(404).json({ error: 'Family not found' })
  }

  await prisma.family.delete({
    where: { id },
  })

  res.status(204).send()
})

export default router
