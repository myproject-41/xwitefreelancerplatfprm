import { Router, Request, Response } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()

// Public routes
router.post('/register', (req: Request, res: Response) => authController.register(req, res))
router.post('/login', (req: Request, res: Response) => authController.login(req, res))

// Protected routes
router.get('/me', authenticate, (req: Request, res: Response) => authController.getMe(req, res))
router.put('/change-password', authenticate, (req: Request, res: Response) => authController.changePassword(req, res))

router.delete('/delete-account', authenticate, (req: Request, res: Response) =>
  authController.deleteAccount(req, res))
export default router