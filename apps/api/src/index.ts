import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import PDFDocument from 'pdfkit'
import { TransactionType } from '@prisma/client'
import { prisma } from './prisma.js'
import { authenticate, generateToken } from './auth.js'

dotenv.config()

const app = express()
app.use(express.json())
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'https://mcgfinances-vfeu.onrender.com,http://localhost:4173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
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
  currency: z.string(),
  updatedAt: z.string(),
})

const createTransactionSchema = z.object({
  description: z.string().min(2),
  amount: z.number().positive(),
  currency: z.string().min(3).max(4).optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  occurredAt: z.string().optional(),
})

const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1),
})

const resetOrganizationSchema = z.object({
  organizationId: z.string().min(1),
})

const formatOrgSummary = (organizations: Array<{ organization: { id: string; name: string; defaultCurrency: string } }>) =>
  organizations.map(({ organization }) => ({
    id: organization.id,
    name: organization.name,
    defaultCurrency: organization.defaultCurrency,
  }))

const getUserOrganizations = async (userId: string) => {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
  })
  return formatOrgSummary(memberships)
}

const formatMoney = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
}

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
              defaultCurrency: 'CAD',
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
        currency: membership.organization.defaultCurrency,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 40),
      },
      {
        description: 'Monthly payroll',
        amount: 52000,
        type: TransactionType.EXPENSE,
        currency: membership.organization.defaultCurrency,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 20),
      },
      {
        description: 'Office rent',
        amount: 8000,
        type: TransactionType.EXPENSE,
        currency: membership.organization.defaultCurrency,
        occurredAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        description: 'New client invoice',
        amount: 22000,
        type: TransactionType.INCOME,
        currency: membership.organization.defaultCurrency,
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

  const organizations = await getUserOrganizations(user.id)

  return res.json({
    token,
    user: { id: user.id, email: user.email },
    organization: membership.organization,
    organizations,
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

  const organizations = await getUserOrganizations(user.id)

  return res.json({
    token,
    user: { id: user.id, email: user.email },
    organization: org,
    organizations,
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
  const organizations = await getUserOrganizations(auth.userId)
  res.json({ user, organization, organizations })
})

app.get('/api/v1/summary', authenticate, async (req, res) => {
  const auth = req.auth!

  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
  })

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
    currency: organization?.defaultCurrency ?? 'CAD',
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

app.get('/api/v1/organizations', authenticate, async (req, res) => {
  const organizations = await getUserOrganizations(req.auth!.userId)
  res.json(organizations)
})

app.post('/api/v1/transactions', authenticate, async (req, res) => {
  const parsed = createTransactionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { description, amount, type, occurredAt, currency } = parsed.data
  const organization = await prisma.organization.findUnique({
    where: { id: req.auth!.organizationId },
  })
  const transaction = await prisma.transaction.create({
    data: {
      description,
      amount: Math.round(amount),
      type: type as TransactionType,
      currency: (currency || organization?.defaultCurrency || 'CAD').toUpperCase(),
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      organizationId: req.auth!.organizationId,
    },
  })
  res.status(201).json(transaction)
})

app.post('/api/v1/session/organization', authenticate, async (req, res) => {
  const parsed = switchOrganizationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { organizationId } = parsed.data
  const membership = await prisma.membership.findFirst({
    where: { userId: req.auth!.userId, organizationId },
    include: { organization: true },
  })
  if (!membership) {
    return res.status(403).json({ message: 'Access denied for organization' })
  }
  const token = generateToken({
    userId: req.auth!.userId,
    organizationId,
  })
  res.json({ token, organization: membership.organization })
})

app.post('/api/v1/organizations/reset', authenticate, async (req, res) => {
  const parsed = resetOrganizationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const { organizationId } = parsed.data
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: req.auth!.userId },
  })
  if (!membership) {
    return res.status(403).json({ message: 'Access denied for organization' })
  }
  await prisma.transaction.deleteMany({ where: { organizationId } })
  await prisma.summary.deleteMany({ where: { organizationId } })
  res.json({ success: true })
})

app.get('/api/v1/transactions/export', authenticate, async (req, res) => {
  const auth = req.auth!
  const { from, to } = req.query
  const filters: Record<string, unknown> = { organizationId: auth.organizationId }
  if (from || to) {
    filters.occurredAt = {}
    if (from) {
      ;(filters.occurredAt as { gte?: Date }).gte = new Date(from as string)
    }
    if (to) {
      ;(filters.occurredAt as { lte?: Date }).lte = new Date(to as string)
    }
  }
  const [transactions, organization] = await Promise.all([
    prisma.transaction.findMany({
      where: filters,
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: { name: true, defaultCurrency: true },
    }),
  ])

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="transactions.pdf"',
  )

  const doc = new PDFDocument({ margin: 40 })
  doc.pipe(res)
  doc
    .fontSize(18)
    .text(`${organization?.name ?? 'MCGFinances'} transaction report`, {
      align: 'center',
    })
  doc.moveDown(0.5)
  if (from || to) {
    doc
      .fontSize(11)
      .text(
        `Range: ${from ? new Date(from as string).toLocaleDateString() : 'Any'} → ${
          to ? new Date(to as string).toLocaleDateString() : 'Any'
        }`,
      )
    doc.moveDown(0.5)
  }

  if (transactions.length === 0) {
    doc.fontSize(12).text('No transactions found for the selected filters.', {
      align: 'left',
    })
    doc.end()
    return
  }

  doc.font('Helvetica-Bold').fontSize(12)
  doc
    .text('Description', { continued: true, width: 220 })
    .text('Type', { continued: true, width: 70 })
    .text('Currency', { continued: true, width: 80 })
    .text('Amount', { continued: true, width: 120 })
    .text('Date')
  doc.moveDown(0.2)
  const separatorY = doc.y
  doc.moveTo(40, separatorY).lineTo(doc.page.width - 40, separatorY).stroke()
  doc.moveDown(0.4)
  doc.font('Helvetica')

  transactions.forEach((transaction) => {
    const signedAmount =
      transaction.type === TransactionType.EXPENSE
        ? -transaction.amount
        : transaction.amount
    doc
      .text(transaction.description, { continued: true, width: 220 })
      .text(transaction.type, { continued: true, width: 70 })
      .text(transaction.currency, { continued: true, width: 80 })
      .text(formatMoney(signedAmount, transaction.currency), {
        continued: true,
        width: 120,
      })
      .text(new Date(transaction.occurredAt).toDateString())
  })
  doc.end()
})

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
