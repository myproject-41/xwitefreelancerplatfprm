import { Request, Response } from 'express'
import { notificationService } from './notification.service'

export class NotificationController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const notifications = await notificationService.getNotifications(req.user!.userId)
      res.json({ success: true, data: notifications })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user!.userId)
      res.json({ success: true, data: notification })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      await notificationService.markAllAsRead(req.user!.userId)
      res.json({ success: true })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

export const notificationController = new NotificationController()
