import { Request, Response } from 'express'
import { userService } from './user.service'
import { profileService } from './profile.service'
import { prisma } from '../../config/db'

export class UserController {
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.userId)
      res.json({ success: true, data: user })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.user!.userId)
      res.json({ success: true, data: user })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }

  async updateFreelancerProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { role: true },
      })

      if (user?.role !== 'FREELANCER') {
        res.status(403).json({ success: false, message: 'Access denied' })
        return
      }

      const profile = await profileService.upsertFreelancerProfile(req.user!.userId, req.body)
      res.json({ success: true, data: profile })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async updateCompanyProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { role: true },
      })

      if (user?.role !== 'COMPANY') {
        res.status(403).json({ success: false, message: 'Access denied' })
        return
      }

      const profile = await profileService.upsertCompanyProfile(req.user!.userId, req.body)
      res.json({ success: true, data: profile })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async updateClientProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { role: true },
      })

      if (user?.role !== 'CLIENT') {
        res.status(403).json({ success: false, message: 'Access denied' })
        return
      }

      const profile = await profileService.upsertClientProfile(req.user!.userId, req.body)
      res.json({ success: true, data: profile })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getPublicProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      const user = await userService.getPublicProfileById(userId)
      res.json({ success: true, data: user })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }
}

export const userController = new UserController()
