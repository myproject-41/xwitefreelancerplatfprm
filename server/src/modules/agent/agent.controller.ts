import { Request, Response } from 'express'
import { agentService } from './agent.service'

export class AgentController {
  async findTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await agentService.findTasksForFreelancer(req.user!.userId)
      res.json({ success: true, data: tasks })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async findFreelancers(req: Request, res: Response): Promise<void> {
    try {
      const result = await agentService.findFreelancersForPost(req.params.postId)
      res.json({ success: true, data: result })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async getMyPosts(req: Request, res: Response): Promise<void> {
    try {
      const posts = await agentService.getRecentPosts(req.user!.userId)
      res.json({ success: true, data: posts })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async generateProposal(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.body
      if (!postId) { res.status(400).json({ success: false, message: 'postId required' }); return }
      const draft = await agentService.generateProposalDraft(postId, req.user!.userId)
      res.json({ success: true, data: draft })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async generateInvite(req: Request, res: Response): Promise<void> {
    try {
      const { postId, freelancerId } = req.body
      if (!postId || !freelancerId) {
        res.status(400).json({ success: false, message: 'postId and freelancerId required' })
        return
      }
      const result = await agentService.generateInviteAndNotify(postId, freelancerId, req.user!.userId)
      res.json({ success: true, data: result })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async notifyFreelancer(req: Request, res: Response): Promise<void> {
    try {
      const { postId, freelancerId } = req.body
      if (!postId || !freelancerId) {
        res.status(400).json({ success: false, message: 'postId and freelancerId required' })
        return
      }
      await agentService.notifyFreelancerDirect(postId, freelancerId, req.user!.userId)
      res.json({ success: true })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }
}

export const agentController = new AgentController()
