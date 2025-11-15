import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

type TokenPayload = {
  userId: string
  organizationId: string
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return secret
}

export const generateToken = (payload: TokenPayload) =>
  jwt.sign(payload, getSecret(), { expiresIn: '7d' })

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing auth token' })
  }
  const token = header.slice('Bearer '.length)
  try {
    const decoded = jwt.verify(token, getSecret()) as TokenPayload
    req.auth = decoded
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
