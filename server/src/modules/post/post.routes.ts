import { Router, Request, Response } from 'express'
import { postController } from './post.controller'
import { authenticate, authorize } from '../../middlewares/auth.middleware'
import { Role } from '../auth/roles'

const router: Router = Router()

router.use(authenticate)

// Feed — all roles
router.get('/feed', (req: Request, res: Response) =>
  postController.getFeed(req, res))

// My posts
router.get('/my', (req: Request, res: Response) =>
  postController.getMyPosts(req, res))

// My sent proposals (freelancer)
router.get('/my-proposals', (req: Request, res: Response) =>
  postController.getMyProposals(req, res))

// Proposals received on my posts (client / company)
router.get('/received-proposals', (req: Request, res: Response) =>
  postController.getReceivedProposals(req, res))

// My post likers (people who liked my posts)
router.get('/my-likers', (req: Request, res: Response) =>
  postController.getMyPostLikers(req, res))

// Public posts by a specific user
router.get('/user/:userId', (req: Request, res: Response) =>
  postController.getUserPosts(req, res))

// Get a single proposal by ID (for chat proposal cards)
router.get('/proposals/:proposalId', (req: Request, res: Response) =>
  postController.getProposal(req, res))

// Create post — company and client only
router.post('/',
  authorize(Role.COMPANY, Role.CLIENT, Role.FREELANCER),
  (req: Request, res: Response) => postController.createPost(req, res))

// Get single post
router.get('/:id', (req: Request, res: Response) =>
  postController.getPost(req, res))

router.post('/:id/like', (req: Request, res: Response) =>
  postController.likePost(req, res))

router.delete('/:id/like', (req: Request, res: Response) =>
  postController.unlikePost(req, res))

// Get users who liked a post
router.get('/:id/likers', (req: Request, res: Response) =>
  postController.getPostLikers(req, res))

// Update post
router.put('/:id', (req: Request, res: Response) =>
  postController.updatePost(req, res))

// Delete post
router.delete('/:id', (req: Request, res: Response) =>
  postController.deletePost(req, res))

// Close post
router.patch('/:id/close', (req: Request, res: Response) =>
  postController.closePost(req, res))

// Proposals
router.post('/:id/proposals',
  authorize(Role.FREELANCER, Role.COMPANY, Role.CLIENT),
  (req: Request, res: Response) => postController.sendProposal(req, res))

router.patch('/:id/proposals/:proposalId/accept',
  (req: Request, res: Response) => postController.acceptProposal(req, res))

router.patch('/:id/proposals/:proposalId/reject',
  (req: Request, res: Response) => postController.rejectProposal(req, res))

router.patch('/:id/proposals/:proposalId/withdraw',
  (req: Request, res: Response) => postController.withdrawProposal(req, res))

export default router
