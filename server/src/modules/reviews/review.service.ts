import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'

export class ReviewService {
  /* ── Create a review (client → freelancer after escrow released) ── */
  async createReview(
    reviewerId: string,
    reviewedId: string,
    rating: number,   // 2, 3, or 5
    comment: string,
    escrowId: string,
  ) {
    if (![2, 3, 5].includes(rating)) throw new Error('Rating must be 2, 3, or 5')

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true, client: true, freelancer: { include: { freelancerProfile: true } } },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== reviewerId) throw new Error('Only the client can leave a review')
    if (escrow.status !== 'RELEASED') throw new Error('Can only review after payment is released')

    const existing = await prisma.review.findFirst({
      where: { reviewerId, reviewedId, taskId: escrow.taskId },
    })
    if (existing) throw new Error('You have already reviewed this task')

    const review = await prisma.review.create({
      data: { reviewerId, reviewedId, rating, comment, taskId: escrow.taskId },
    })

    // Recalculate avg rating for the reviewed user
    const allReviews = await prisma.review.findMany({ where: { reviewedId } })
    const totalReviews = allReviews.length
    const avgRating = totalReviews > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews
      : 0
    const totalStars = allReviews.reduce((s, r) => s + r.rating, 0)

    await prisma.freelancerProfile.updateMany({
      where: { userId: reviewedId },
      data: { avgRating: Math.round(avgRating * 10) / 10, totalReviews },
    })

    // Auto-verify freelancer: total stars >= 10 OR completed tasks >= 3
    const completedTasks = await prisma.escrow.count({
      where: { freelancerId: reviewedId, status: 'RELEASED' },
    })
    if (totalStars >= 10 || completedTasks >= 3) {
      await prisma.user.update({ where: { id: reviewedId }, data: { isVerified: true } })
    }

    // Notify freelancer
    const ratingLabel = rating === 5 ? 'Excellent' : rating === 3 ? 'Very Good' : 'Good'
    const reviewerProfile = await prisma.user.findUnique({
      where: { id: reviewerId },
      include: { clientProfile: true, companyProfile: true },
    })
    const reviewerName =
      reviewerProfile?.clientProfile?.fullName ||
      reviewerProfile?.companyProfile?.companyName ||
      reviewerProfile?.email ||
      'Client'

    await notificationService.createNotification({
      userId:   reviewedId,
      type:     'REVIEW_RECEIVED',
      entityId: review.id,
      title:    `${reviewerName} gave you ${rating}⭐ — ${ratingLabel}!`,
      message:  comment
        ? `"${comment.slice(0, 100)}${comment.length > 100 ? '…' : ''}"`
        : `${reviewerName} liked your work on "${escrow.task.title}".`,
      link:     `/profile/freelancer`,
      metadata: { rating, ratingLabel, reviewerName, taskTitle: escrow.task.title },
    })

    return review
  }

  /* ── Get reviews for a user ── */
  async getReviewsForUser(userId: string) {
    return prisma.review.findMany({
      where: { reviewedId: userId },
      include: {
        reviewer: {
          select: {
            id: true, role: true,
            clientProfile:  { select: { fullName: true, profileImage: true, companyName: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /* ── Check if the viewer already reviewed this escrow ── */
  async hasReviewed(reviewerId: string, escrowId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } })
    if (!escrow) return false
    const existing = await prisma.review.findFirst({
      where: { reviewerId, reviewedId: escrow.freelancerId, taskId: escrow.taskId },
    })
    return Boolean(existing)
  }
}

export const reviewService = new ReviewService()
