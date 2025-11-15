import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { authenticate, generateToken } from './auth'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan('dev'))

const port = process.env.PORT || 4000

const healthSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
})

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const summarySchema = z.object({
  cashOnHand: z.number(),
  monthlyBurn: z.number(),
  runwayMonths: z.number(),
  updatedAt: z.string(),
})

app.get('/healthz', (_req, res) => {
  const payload = { status: 'ok', uptime: process.uptime() }
  const parsed = healthSchema.parse(payload)
  res.json(parsed)
})

app.post('/api/v1/auth/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { email, password, organizationName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ message: 'Account already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      memberships: {
        create: {
          role: 'owner',
          organization: {
            create: {
              name: organizationName,
              summary: {
                create: {
                  cashOnHand: 120000,
                  monthlyBurn: 25000,
                  runwayMonths: 4.8,
                },
              },
            },
          },
        },
      },
    },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  })

  const membership = user.memberships[0]
  const token = generateToken({
    userId: user.id,
    organizationId: membership.organizationId,
  })

  return res.json({
    token,
    user: { id: user.id, email: user.email },
    organization: membership.organization,
  })
})

app.post('/api/v1/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  })
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const membership = user.memberships[0]
  if (!membership) {
    return res.status(403).json({ message: 'No organization access' })
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  })

  const token = generateToken({
    userId: user.id,
    organizationId: membership.organizationId,
  })

  return res.json({
    token,
    user: { id: user.id, email: user.email },
    organization: org,
  })
})

app.get('/api/v1/auth/me', authenticate, async (req, res) => {
  const auth = req.auth!
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true },
  })
  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
  })
  res.json({ user, organization })
})

app.get('/api/v1/summary', authenticate, async (req, res) => {
  const auth = req.auth!
  const summary = await prisma.summary.upsert({
    where: { organizationId: auth.organizationId },
    update: { updatedAt: new Date() },
    create: {
      organizationId: auth.organizationId,
      cashOnHand: 120000,
      monthlyBurn: 25000,
      runwayMonths: 4.8,
    },
  })
  const payload = summarySchema.parse({
    cashOnHand: summary.cashOnHand,
    monthlyBurn: summary.monthlyBurn,
    runwayMonths: summary.runwayMonths,
    updatedAt: summary.updatedAt.toISOString(),
  })
  res.json(payload)
})

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
