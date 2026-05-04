import { Router } from 'express'
import { adminController } from './admin.controller'
import { authenticate, authorizeAdmin } from '../../middlewares/auth.middleware'

const router = Router()

router.use(authenticate, authorizeAdmin)

router.get('/dashboard', adminController.getDashboard.bind(adminController))
router.get('/gst/pending', adminController.getPendingGst.bind(adminController))
router.post('/gst/:userId/approve', adminController.approveGst.bind(adminController))
router.post('/users/:userId/revoke', adminController.revokeVerification.bind(adminController))

export default router
