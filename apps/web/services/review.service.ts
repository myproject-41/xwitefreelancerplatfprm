import apiClient from './apiClient'

export const reviewService = {
  createReview: (data: { reviewedId: string; rating: number; comment: string; escrowId: string }) =>
    apiClient.post('/api/reviews', data),

  getReviewsForUser: (userId: string) =>
    apiClient.get(`/api/reviews/user/${userId}`),

  hasReviewed: (escrowId: string) =>
    apiClient.get(`/api/reviews/check?escrowId=${escrowId}`),
}
