import { Router, Request, Response } from 'express'
import { userController } from './user.controller'
import { authenticate } from '../../middlewares/auth.middleware'
import { followService } from '../network/follow.service'

const router: Router = Router()

router.get('/public/:userId', (req: Request, res: Response) =>
  userController.getPublicProfile(req, res)
)

// Public — no auth required to view followers of a user
router.get('/:userId/followers', async (req: Request, res: Response) => {
  try {
    const follows = await followService.getFollowers(req.params.userId)
    const data = follows.map((f: any) => ({
      id: f.follower.id,
      fullName:
        f.follower.freelancerProfile?.fullName ??
        f.follower.companyProfile?.companyName ??
        f.follower.clientProfile?.fullName ??
        null,
      profileImage:
        f.follower.freelancerProfile?.profileImage ??
        f.follower.companyProfile?.profileImage ??
        f.follower.clientProfile?.profileImage ??
        null,
      email: f.follower.email,
      role: f.follower.role,
    }))
    res.json({ success: true, data, total: data.length })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

router.use(authenticate)

router.get('/me', (req: Request, res: Response) =>
  userController.getMe(req, res))

router.put('/profile/freelancer',
  (req: Request, res: Response) =>
    userController.updateFreelancerProfile(req, res))

router.put('/profile/company',
  (req: Request, res: Response) =>
    userController.updateCompanyProfile(req, res))

router.put('/profile/client',
  (req: Request, res: Response) =>
    userController.updateClientProfile(req, res))

router.post('/:userId/follow', async (req: Request, res: Response) => {
  try {
    await followService.follow(req.user!.userId, req.params.userId)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

router.delete('/:userId/follow', async (req: Request, res: Response) => {
  try {
    await followService.unfollow(req.user!.userId, req.params.userId)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

router.get('/:userId/is-following', async (req: Request, res: Response) => {
  try {
    const isFollowing = await followService.isFollowing(req.user!.userId, req.params.userId)
    res.json({ success: true, isFollowing })
  } catch {
    res.json({ success: true, isFollowing: false })
  }
})

router.get('/:userId', (req: Request, res: Response) =>
  userController.getUserById(req, res))

export default router
