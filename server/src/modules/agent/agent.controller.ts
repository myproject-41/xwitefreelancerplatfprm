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

  async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const { toUserId, taskTitle } = req.body
      if (!toUserId) {
        res.status(400).json({ success: false, message: 'toUserId is required' })
        return
      }
      await agentService.agentSendRequest(req.user!.userId, toUserId, taskTitle ?? 'a task')
      res.json({ success: true })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }
}

export const agentController = new AgentController()
