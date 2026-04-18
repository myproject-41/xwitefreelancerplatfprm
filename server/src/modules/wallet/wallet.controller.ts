import { Request, Response } from 'express'
import { walletService } from './wallet.service'

export class WalletController {

  async getWallet(req: Request, res: Response): Promise<void> {
    try {
      const wallet = await walletService.getWallet(req.user!.userId)
      res.json({ success: true, data: wallet })
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message })
    }
  }

  /* POST /api/wallet/create-order  — returns Razorpay order */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { amount } = req.body
      if (!amount || Number(amount) <= 0) {
        res.status(400).json({ success: false, message: 'Invalid amount' })
        return
      }
      const data = await walletService.createOrder(req.user!.userId, Number(amount))
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  /* POST /api/wallet/verify-payment  — verifies signature and credits wallet */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({ success: false, message: 'Missing payment details' })
        return
      }
      const wallet = await walletService.verifyPayment(
        req.user!.userId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      )
      res.json({ success: true, data: wallet })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  /* POST /api/wallet/webhook  — Razorpay webhook (no auth middleware) */
  async webhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string
      if (!signature) {
        res.status(400).json({ success: false, message: 'Missing signature' })
        return
      }
      // rawBody is set by the express.raw() middleware on this route
      await walletService.handleWebhook((req as any).rawBody, signature)
      res.json({ success: true })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      const { amount } = req.body
      if (!amount || Number(amount) <= 0) {
        res.status(400).json({ success: false, message: 'Invalid amount' })
        return
      }
      const wallet = await walletService.withdrawFunds(req.user!.userId, Number(amount))
      res.json({ success: true, data: wallet })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query
      const result = await walletService.getTransactions(
        req.user!.userId,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20,
      )
      res.json({ success: true, data: result })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

export const walletController = new WalletController()
