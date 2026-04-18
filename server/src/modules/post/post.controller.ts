import { Request, Response } from 'express'
import { z } from 'zod'
import { postService } from './post.service'
import { proposalService } from './proposal.service'
import { Role } from '../auth/roles'

const createPostSchema = z.object({
  type: z.enum(['JOB', 'TASK', 'COLLAB', 'SKILL_EXCHANGE']),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  budget: z.coerce.number().positive().optional(),
  deadline: z.string().optional(),
  skills: z.array(z.string()).default([]),
})

const proposalSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  proposedRate: z.number().optional(),
})

export class PostController {
  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, type, search } = req.query
      const result = await postService.getFeed({
        role: req.user!.role as Role,
        userId: req.user!.userId,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        type: type as string,
        search: search as string,
      })
      res.json({ success: true, data: result })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const body = createPostSchema.parse(req.body)
      const post = await postService.createPost({
        ...body,
        clientId: req.user!.userId,
      })
      res.status(201).json({ success: true, data: post })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors })
        return
      }
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const post = await postService.getPostById(req.params.id, req.user?.userId)
      res.json({ success: true, data: post })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }

  async getMyPosts(req: Request, res: Response): Promise<void> {
    try {
      const posts = await postService.getMyPosts(req.user!.userId)
      res.json({ success: true, data: posts })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const posts = await postService.getUserPosts(req.params.userId)
      res.json({ success: true, data: posts })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async likePost(req: Request, res: Response): Promise<void> {
    try {
      const state = await postService.likePost(req.params.id, req.user!.userId)
      res.json({ success: true, data: state })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async unlikePost(req: Request, res: Response): Promise<void> {
    try {
      const state = await postService.unlikePost(req.params.id, req.user!.userId)
      res.json({ success: true, data: state })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getPostLikers(req: Request, res: Response): Promise<void> {
    try {
      const likers = await postService.getPostLikers(req.params.id)
      res.json({ success: true, data: likers })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getMyPostLikers(req: Request, res: Response): Promise<void> {
    try {
      const likers = await postService.getMyPostLikers(req.user!.userId)
      res.json({ success: true, data: likers })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const post = await postService.updatePost(req.params.id, req.user!.userId, req.body)
      res.json({ success: true, data: post })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      await postService.deletePost(req.params.id, req.user!.userId)
      res.json({ success: true, message: 'Post deleted' })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async closePost(req: Request, res: Response): Promise<void> {
    try {
      const post = await postService.closePost(req.params.id, req.user!.userId)
      res.json({ success: true, data: post })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async sendProposal(req: Request, res: Response): Promise<void> {
    try {
      const body = proposalSchema.parse(req.body)
      const proposal = await proposalService.createProposal({
        postId: req.params.id,
        freelancerId: req.user!.userId,
        ...body,
      })
      res.status(201).json({ success: true, data: proposal })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors })
        return
      }
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getMyProposals(req: Request, res: Response): Promise<void> {
    try {
      const proposals = await proposalService.getMyProposals(req.user!.userId)
      res.json({ success: true, data: proposals })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async getReceivedProposals(req: Request, res: Response): Promise<void> {
    try {
      const proposals = await proposalService.getReceivedProposals(req.user!.userId)
      res.json({ success: true, data: proposals })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async acceptProposal(req: Request, res: Response): Promise<void> {
    try {
      const proposal = await proposalService.acceptProposal(
        req.params.proposalId,
        req.user!.userId
      )
      res.json({ success: true, data: proposal })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async rejectProposal(req: Request, res: Response): Promise<void> {
    try {
      const proposal = await proposalService.rejectProposal(
        req.params.proposalId,
        req.user!.userId
      )
      res.json({ success: true, data: proposal })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getProposal(req: Request, res: Response): Promise<void> {
    try {
      const proposal = await proposalService.getProposal(req.params.proposalId, req.user!.userId)
      res.json({ success: true, data: proposal })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }

  async withdrawProposal(req: Request, res: Response): Promise<void> {
    try {
      const proposal = await proposalService.withdrawProposal(
        req.params.proposalId,
        req.user!.userId
      )
      res.json({ success: true, data: proposal })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }
}

export const postController = new PostController()
