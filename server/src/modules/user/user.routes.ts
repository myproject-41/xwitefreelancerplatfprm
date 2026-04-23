import { Router, Request, Response } from 'express'
import { userController } from './user.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()

router.get('/public/:userId', (req: Request, res: Response) =>
  userController.getPublicProfile(req, res)
)

router.use(authenticate)

router.get('/me', (req: Request, res: Response) =>
  userController.getMe(req, res))

router.get('/:userId', (req: Request, res: Response) =>
  userController.getUserById(req, res))

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
