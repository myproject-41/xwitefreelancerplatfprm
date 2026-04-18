import { Router, Request, Response } from 'express'
import express from 'express'
import { walletController } from './wallet.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()

// Webhook must receive raw body for signature verification — no auth
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response) => {
    ;(req as any).rawBody = req.body.toString('utf8')
    walletController.webhook(req, res)
  },
)

router.use(authenticate)

router.get('/',              (req, res) => walletController.getWallet(req, res))
router.post('/create-order', (req, res) => walletController.createOrder(req, res))
router.post('/verify-payment',(req, res) => walletController.verifyPayment(req, res))
router.post('/withdraw',     (req, res) => walletController.withdrawFunds(req, res))
router.get('/transactions',  (req, res) => walletController.getTransactions(req, res))

export default router
