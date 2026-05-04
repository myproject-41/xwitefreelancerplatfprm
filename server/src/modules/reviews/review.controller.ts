import { Request, Response } from 'express'
import { reviewService } from './review.service'

export class ReviewController {
  async createReview(req: Request, res: Response) {
    try {
      const reviewerId = (req as any).user?.id
      const { reviewedId, rating, comment, escrowId } = req.body
      if (!reviewerId) return res.status(401).json({ message: 'Unauthorized' })
      if (!reviewedId || !rating || !escrowId) {
        return res.status(400).json({ message: 'reviewedId, rating, and escrowId are required' })
      }
      const review = await reviewService.createReview(reviewerId, reviewedId, Number(rating), comment ?? '', escrowId)
      return res.status(201).json(review)
    } catch (err: any) {
      return res.status(400).json({ message: err.message })
    }
  }

  async getReviewsForUser(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const reviews = await reviewService.getReviewsForUser(userId)
      return res.json(reviews)
    } catch (err: any) {
      return res.status(500).json({ message: err.message })
    }
  }

  async checkReviewed(req: Request, res: Response) {
    try {
      const reviewerId = (req as any).user?.id
      const { escrowId } = req.query
      if (!reviewerId || !escrowId) return res.json({ reviewed: false })
      const reviewed = await reviewService.hasReviewed(reviewerId, String(escrowId))
      return res.json({ reviewed })
    } catch {
      return res.json({ reviewed: false })
    }
  }
}

export const reviewController = new ReviewController()
