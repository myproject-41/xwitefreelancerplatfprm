import { Router } from 'express'
import { agentController } from './agent.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/find-tasks', agentController.findTasks.bind(agentController))
router.get('/find-freelancers/:postId', agentController.findFreelancers.bind(agentController))
router.get('/my-posts', agentController.getMyPosts.bind(agentController))
router.post('/send-request', agentController.sendRequest.bind(agentController))

export default router
