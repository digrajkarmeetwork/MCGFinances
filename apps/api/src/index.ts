import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { TransactionType } from '@prisma/client'
import { prisma } from './prisma.js'
import { authenticate, generateToken } from './auth.js'

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

const createTransactionSchema = z.object({
  description: z.string().min(2),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  occurredAt: z.string().datetime().optional(),
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

  if (membership) {
    const baseDate = new Date()
    const sampleTransactions = [
      {
        description: 'Seed round funding',
        amount: 150000,
        type: TransactionType.INCOME,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 40),
      },
      {
        description: 'Monthly payroll',
        amount: 52000,
        type: TransactionType.EXPENSE,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 20),
      },
      {
        description: 'Office rent',
        amount: 8000,
        type: TransactionType.EXPENSE,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        description: 'New client invoice',
        amount: 22000,
        type: TransactionType.INCOME,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 5),
      },
    ]

    await prisma.transaction.createMany({
      data: sampleTransactions.map((transaction) => ({
        organizationId: membership.organizationId,
        ...transaction,
      })),
    })
  }
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

  const transactions = await prisma.transaction.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { occurredAt: 'desc' },
  })

  const now = new Date()
  const burnWindow = new Date(now)
  burnWindow.setMonth(burnWindow.getMonth() - 1)

  const cashOnHand = transactions.reduce((total, transaction) => {
    return total + (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount)
  }, 0)

  const monthlyBurn = transactions
    .filter((transaction) => transaction.type === TransactionType.EXPENSE && transaction.occurredAt >= burnWindow)
    .reduce((total, transaction) => total + transaction.amount, 0)

  const runwayMonths = monthlyBurn > 0 ? Number((cashOnHand / monthlyBurn).toFixed(1)) : 0

  const summaryRecord = await prisma.summary.upsert({
    where: { organizationId: auth.organizationId },
    update: {
      cashOnHand,
      monthlyBurn,
      runwayMonths,
    },
    create: {
      organizationId: auth.organizationId,
      cashOnHand,
      monthlyBurn,
      runwayMonths,
    },
  })

  const payload = summarySchema.parse({
    cashOnHand: summaryRecord.cashOnHand,
    monthlyBurn: summaryRecord.monthlyBurn,
    runwayMonths: summaryRecord.runwayMonths,
    updatedAt: summaryRecord.updatedAt.toISOString(),
  })
  res.json(payload)
})

app.get('/api/v1/transactions', authenticate, async (req, res) => {
  const auth = req.auth!
  const transactions = await prisma.transaction.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  })
  res.json(transactions)
})

app.post('/api/v1/transactions', authenticate, async (req, res) => {
  const parsed = createTransactionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { description, amount, type, occurredAt } = parsed.data
  const transaction = await prisma.transaction.create({
    data: {
      description,
      amount: Math.round(amount),
      type: type as TransactionType,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      organizationId: req.auth!.organizationId,
    },
  })
  res.status(201).json(transaction)
})

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
