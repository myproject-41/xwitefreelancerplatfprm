import { Router, Request, Response } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { notificationController } from './notification.controller'

const router: Router = Router()

router.use(authenticate)

router.get('/', (req: Request, res: Response) =>
  notificationController.list(req, res))

router.patch('/read-all', (req: Request, res: Response) =>
  notificationController.markAllAsRead(req, res))

router.patch('/:id/read', (req: Request, res: Response) =>
  notificationController.markAsRead(req, res))

export default router
