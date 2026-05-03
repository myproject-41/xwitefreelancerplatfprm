import { Router, Request, Response } from 'express'
import { postController } from './post.controller'
import { authenticate, authorize, optionalAuthenticate } from '../../middlewares/auth.middleware'
import { Role } from '../auth/roles'

const router: Router = Router()

// ── PUBLIC (no auth required) ──────────────────────────────────────────
router.get('/user/:userId', (req: Request, res: Response) =>
  postController.getUserPosts(req, res))

// ── AUTH-REQUIRED named routes must come BEFORE /:id wildcard ──────────
// (Express matches routes in order; /:id would swallow /feed, /my, etc.)
router.get('/feed', authenticate, (req: Request, res: Response) =>
  postController.getFeed(req, res))

router.get('/my', authenticate, (req: Request, res: Response) =>
  postController.getMyPosts(req, res))

router.get('/my-proposals', authenticate, (req: Request, res: Response) =>
  postController.getMyProposals(req, res))

router.get('/received-proposals', authenticate, (req: Request, res: Response) =>
  postController.getReceivedProposals(req, res))

router.get('/my-likers', authenticate, (req: Request, res: Response) =>
  postController.getMyPostLikers(req, res))

// ── Single post — public but enriched for logged-in viewers ────────────
// Must come AFTER all named GET routes and BEFORE router.use(authenticate)
router.get('/:id', optionalAuthenticate, (req: Request, res: Response) =>
  postController.getPost(req, res))

// ── All routes below require authentication ────────────────────────────
router.use(authenticate)

// Get a single proposal by ID (for chat proposal cards)
router.get('/proposals/:proposalId', (req: Request, res: Response) =>
  postController.getProposal(req, res))

// Create post
router.post('/',
  authorize(Role.COMPANY, Role.CLIENT, Role.FREELANCER),
  (req: Request, res: Response) => postController.createPost(req, res))

router.post('/:id/like', (req: Request, res: Response) =>
  postController.likePost(req, res))

router.delete('/:id/like', (req: Request, res: Response) =>
  postController.unlikePost(req, res))

router.get('/:id/likers', (req: Request, res: Response) =>
  postController.getPostLikers(req, res))

router.put('/:id', (req: Request, res: Response) =>
  postController.updatePost(req, res))

router.delete('/:id', (req: Request, res: Response) =>
  postController.deletePost(req, res))

router.patch('/:id/close', (req: Request, res: Response) =>
  postController.closePost(req, res))

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
