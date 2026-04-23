import { Request, Response } from 'express'
import { z } from 'zod'
import { authService } from './auth.service'
import { Role } from './roles'

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum([Role.FREELANCER, Role.COMPANY, Role.CLIENT]),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to delete account'),
})

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const body = registerSchema.parse(req.body)
      const result = await authService.register(body)

      if (result.existingAccount) {
        return res.status(200).json({
          success: true,
          message: 'Email already registered',
          data: result,
        })
      }

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: result,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed. Please try again.',
      })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const body = loginSchema.parse(req.body)
      const result = await authService.login(body)

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
      }

      if (
        error.message === 'Invalid email or password' ||
        error.message === 'Account is deactivated. Contact support.'
      ) {
        return res.status(401).json({
          success: false,
          message: error.message,
        })
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Login failed. Please try again.',
      })
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const user = await authService.getMe(userId)

      const token = authService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as Role,
      })

      res.status(200).json({
        success: true,
        data: user,
        token,
      })
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      })
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const body = changePasswordSchema.parse(req.body)
      const result = await authService.changePassword(
        userId,
        body.oldPassword,
        body.newPassword
      )

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
        return
      }

      res.status(400).json({
        success: false,
        message: error.message,
      })
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const body = deleteAccountSchema.parse(req.body)
      const result = await authService.deleteAccount(userId, body.password)

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        })
        return
      }

      res.status(400).json({
        success: false,
        message: error.message,
      })
    }
  }
}

export const authController = new AuthController()
