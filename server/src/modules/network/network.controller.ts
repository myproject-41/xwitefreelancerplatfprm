import { Request, Response } from 'express'
import { connectionService } from './connection.service'
import { followService } from './follow.service'

export class NetworkController {
  // ── Connections ───────────────────────────
  async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const result = await connectionService.sendRequest(
        req.user!.userId,
        req.params.userId
      )
      res.status(201).json({ success: true, data: result })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const result = await connectionService.acceptRequest(
        req.params.connectionId,
        req.user!.userId
      )
      res.json({ success: true, data: result })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const result = await connectionService.rejectRequest(
        req.params.connectionId,
        req.user!.userId
      )
      res.json({ success: true, data: result })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async removeConnection(req: Request, res: Response): Promise<void> {
    try {
      await connectionService.removeConnection(
        req.params.connectionId,
        req.user!.userId
      )
      res.json({ success: true, message: 'Connection removed' })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const data = await connectionService.getPendingRequests(req.user!.userId)
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }

  async getConnections(req: Request, res: Response): Promise<void> {
    try {
      const data = await connectionService.getConnections(
        req.user!.userId,
        req.query.search as string
      )
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const data = await connectionService.getSuggestions(req.user!.userId)
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }

  async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const data = await connectionService.getStatus(
        req.user!.userId,
        req.params.userId
      )
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }

  // ── Follow ────────────────────────────────
  async follow(req: Request, res: Response): Promise<void> {
    try {
      const data = await followService.follow(req.user!.userId, req.params.userId)
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async unfollow(req: Request, res: Response): Promise<void> {
    try {
      await followService.unfollow(req.user!.userId, req.params.userId)
      res.json({ success: true, message: 'Unfollowed' })
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message })
    }
  }

  async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const data = await followService.getFollowing(req.user!.userId)
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }

  async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const data = await followService.getFollowers(req.user!.userId)
      res.json({ success: true, data })
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message })
    }
  }
}

export const networkController = new NetworkController()