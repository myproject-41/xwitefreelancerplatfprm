import { Router } from 'express'
import { adminController } from './admin.controller'
import { authenticate, authorize } from '../../middlewares/auth.middleware'
import { Role } from '../auth/roles'

const router = Router()

router.use(authenticate, authorize(Role.ADMIN))

router.get('/dashboard', adminController.getDashboard.bind(adminController))
router.get('/gst/pending', adminController.getPendingGst.bind(adminController))
router.post('/gst/:userId/approve', adminController.approveGst.bind(adminController))
router.post('/users/:userId/revoke', adminController.revokeVerification.bind(adminController))

export default router
