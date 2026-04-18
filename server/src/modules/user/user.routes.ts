import { Router, Request, Response } from 'express'
import { userController } from './user.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()

// ✅ 1. PUBLIC ROUTE (NO AUTH)
router.get('/public/:userId', (req: Request, res: Response) =>
  userController.getPublicProfile(req, res)
)

// 🔒 2. APPLY AUTH AFTER PUBLIC
router.use(authenticate)

// ✅ 3. OWN PROFILE (PROTECTED)
router.get('/me', (req: Request, res: Response) =>
  userController.getMe(req, res))

// ✅ 4. UPDATE PROFILE (PROTECTED)
router.put('/profile/freelancer',
  (req: Request, res: Response) =>
    userController.updateFreelancerProfile(req, res))

router.put('/profile/company',
  (req: Request, res: Response) =>
    userController.updateCompanyProfile(req, res))

router.put('/profile/client',
  (req: Request, res: Response) =>
    userController.updateClientProfile(req, res))

export default router