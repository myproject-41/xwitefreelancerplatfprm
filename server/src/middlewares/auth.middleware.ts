import { Request, Response, NextFunction } from 'express'
import { authService } from '../modules/auth/auth.service'
import { Role, hasPermission } from '../modules/auth/roles'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: Role
      }
      rawBody?: string
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      })
      return
    }

    const token = authHeader.split(' ')[1]
    const payload = authService.verifyToken(token)
    req.user = payload
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      })
      return
    }

    next()
  }
}

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
      return
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        success: false,
        message: `You don't have permission to perform this action`,
      })
      return
    }

    next()
  }
}
