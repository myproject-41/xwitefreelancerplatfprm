import { Request, Response } from 'express'
import { adminService } from './admin.service'

export class AdminController {
  async getDashboard(req: Request, res: Response) {
    try {
      const stats = await adminService.getDashboardStats()
      return res.json(stats)
    } catch (err: any) {
      return res.status(500).json({ message: err.message })
    }
  }

  async getPendingGst(req: Request, res: Response) {
    try {
      const companies = await adminService.getPendingGstCompanies()
      return res.json(companies)
    } catch (err: any) {
      return res.status(500).json({ message: err.message })
    }
  }

  async approveGst(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const result = await adminService.approveGst(userId)
      return res.json(result)
    } catch (err: any) {
      return res.status(400).json({ message: err.message })
    }
  }

  async revokeVerification(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const result = await adminService.revokeVerification(userId)
      return res.json(result)
    } catch (err: any) {
      return res.status(400).json({ message: err.message })
    }
  }
}

export const adminController = new AdminController()
