import { Router, Request, Response } from 'express'
import { networkController } from './network.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()
router.use(authenticate)

// Suggestions
router.get('/suggestions', (req: Request, res: Response) =>
  networkController.getSuggestions(req, res))

// Pending requests
router.get('/pending', (req: Request, res: Response) =>
  networkController.getPendingRequests(req, res))

// All connections
router.get('/connections', (req: Request, res: Response) =>
  networkController.getConnections(req, res))

// Connection status with specific user
router.get('/status/:userId', (req: Request, res: Response) =>
  networkController.getConnectionStatus(req, res))

// Send request
router.post('/connect/:userId', (req: Request, res: Response) =>
  networkController.sendRequest(req, res))

// Accept request
router.patch('/accept/:connectionId', (req: Request, res: Response) =>
  networkController.acceptRequest(req, res))

// Reject request
router.patch('/reject/:connectionId', (req: Request, res: Response) =>
  networkController.rejectRequest(req, res))

// Remove connection
router.delete('/remove/:connectionId', (req: Request, res: Response) =>
  networkController.removeConnection(req, res))

// Follow
router.post('/follow/:userId', (req: Request, res: Response) =>
  networkController.follow(req, res))

// Unfollow
router.delete('/unfollow/:userId', (req: Request, res: Response) =>
  networkController.unfollow(req, res))

// Following list
router.get('/following', (req: Request, res: Response) =>
  networkController.getFollowing(req, res))

// Followers list
router.get('/followers', (req: Request, res: Response) =>
  networkController.getFollowers(req, res))

export default router