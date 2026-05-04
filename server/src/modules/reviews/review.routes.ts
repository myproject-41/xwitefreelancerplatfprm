import { Router } from 'express'
import { reviewController } from './review.controller'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()

// Public: get reviews for a user profile
router.get('/user/:userId', reviewController.getReviewsForUser.bind(reviewController))

router.use(authenticate)

// Check if already reviewed (client checks before showing review form)
router.get('/check', reviewController.checkReviewed.bind(reviewController))

// Submit a review
router.post('/', reviewController.createReview.bind(reviewController))

export default router
