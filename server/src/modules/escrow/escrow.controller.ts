import { Request, Response } from 'express'
import { escrowService } from './escrow.service'

export class EscrowController {

  async getMyEscrows(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.getMyEscrows(req.user!.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async getEscrow(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.getEscrow(req.params.id, req.user!.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      const status = error.message === 'Not authorized' ? 403 : 404
      res.status(status).json({ success: false, message: error.message })
    }
  }

  async fundEscrow(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.fundEscrow(req.params.id, req.user!.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async submitWork(req: Request, res: Response): Promise<void> {
    try {
      const { submissionNote, submissionFiles } = req.body
      const data = await escrowService.submitWork(
        req.params.id,
        req.user!.userId,
        submissionNote?.trim() ?? '',
        Array.isArray(submissionFiles) ? submissionFiles : [],
      )
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async requestRevision(req: Request, res: Response): Promise<void> {
    try {
      const { revisionNote, revisionImage } = req.body
      if (!revisionNote?.trim()) {
        res.status(400).json({ success: false, message: 'Revision details are required' })
        return
      }
      const data = await escrowService.requestRevision(
        req.params.id,
        req.user!.userId,
        revisionNote.trim(),
        revisionImage ?? undefined,
      )
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async releaseEscrow(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.releaseEscrow(req.params.id, req.user!.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async openDispute(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body
      if (!reason?.trim()) {
        res.status(400).json({ success: false, message: 'Dispute reason is required' })
        return
      }
      const data = await escrowService.openDispute(req.params.id, req.user!.userId, reason.trim())
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { winner } = req.body
      if (!['CLIENT', 'FREELANCER'].includes(winner)) {
        res.status(400).json({ success: false, message: 'winner must be CLIENT or FREELANCER' })
        return
      }
      const data = await escrowService.resolveDispute(req.params.id, req.user!.userId, winner)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getFreelancerCompletedTasks(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.getFreelancerCompletedTasks(req.params.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async getClientSpend(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.getClientSpend(req.params.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  async cancelEscrow(req: Request, res: Response): Promise<void> {
    try {
      const data = await escrowService.cancelEscrow(req.params.id, req.user!.userId)
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }
}

export const escrowController = new EscrowController()
