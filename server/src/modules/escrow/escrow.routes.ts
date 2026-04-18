import { Router } from 'express'
import { escrowController } from './escrow.controller'
import { authenticate, authorize } from '../../middlewares/auth.middleware'
import { Role } from '../auth/roles'

const router = Router()

// Public: freelancer completed tasks (for profile pages)
router.get('/freelancer/:userId/completed', escrowController.getFreelancerCompletedTasks.bind(escrowController))

router.use(authenticate)

// List & detail
router.get('/my',  escrowController.getMyEscrows.bind(escrowController))
router.get('/:id', escrowController.getEscrow.bind(escrowController))

// Client actions
router.post('/:id/fund',    escrowController.fundEscrow.bind(escrowController))
router.post('/:id/release', escrowController.releaseEscrow.bind(escrowController))
router.delete('/:id/cancel', escrowController.cancelEscrow.bind(escrowController))

// Freelancer action
router.post('/:id/submit', escrowController.submitWork.bind(escrowController))

// Client revision request
router.post('/:id/revision', escrowController.requestRevision.bind(escrowController))

// Either party
router.post('/:id/dispute', escrowController.openDispute.bind(escrowController))

// Admin only
router.post('/:id/resolve', authorize(Role.ADMIN), escrowController.resolveDispute.bind(escrowController))

export default router
