import { Router, Request, Response } from 'express'
import { walletController } from './wallet.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router: Router = Router()

// Webhook must receive raw body for signature verification; app-level JSON
// middleware now preserves the exact payload for this route.
router.post('/webhook', (req: Request, res: Response) => {
  walletController.webhook(req, res)
})

router.use(authenticate)

router.get('/',              (req, res) => walletController.getWallet(req, res))
router.post('/create-order', (req, res) => walletController.createOrder(req, res))
router.post('/verify-payment',(req, res) => walletController.verifyPayment(req, res))
router.post('/withdraw',     (req, res) => walletController.withdrawFunds(req, res))
router.get('/transactions',  (req, res) => walletController.getTransactions(req, res))

export default router
