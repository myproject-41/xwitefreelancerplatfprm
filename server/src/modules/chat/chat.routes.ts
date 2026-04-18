import { Router, Request, Response } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import { chatController } from './chat.controller'

const router: Router = Router()

router.use(authenticate)

router.get('/conversations', (req: Request, res: Response) =>
  chatController.listConversations(req, res))

router.post('/conversations/with/:userId', (req: Request, res: Response) =>
  chatController.getOrCreateConversation(req, res))

router.get('/conversations/:conversationId/messages', (req: Request, res: Response) =>
  chatController.listMessages(req, res))

router.post('/conversations/:conversationId/messages', (req: Request, res: Response) =>
  chatController.sendMessage(req, res))

router.patch('/conversations/:conversationId/read', (req: Request, res: Response) =>
  chatController.markAsRead(req, res))

export default router
