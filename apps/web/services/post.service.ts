import apiClient from './apiClient'

export const postService = {
  async getFeed(params?: {
    page?: number
    limit?: number
    type?: string
    search?: string
  }) {
    const res = await apiClient.get('/api/posts/feed', { params })
    return res.data
  },

  async createPost(data: {
    type: string
    title: string
    description: string
    budget?: number
    deadline?: string
    skills: string[]
  }) {
    const res = await apiClient.post('/api/posts', data)
    return res.data
  },

  async getPost(id: string) {
    const res = await apiClient.get(`/api/posts/${id}`)
    return res.data
  },

  async getMyPosts() {
    const res = await apiClient.get('/api/posts/my')
    return res.data
  },

  async likePost(postId: string) {
    const res = await apiClient.post(`/api/posts/${postId}/like`)
    return res.data
  },

  async unlikePost(postId: string) {
    const res = await apiClient.delete(`/api/posts/${postId}/like`)
    return res.data
  },

  async sendProposal(postId: string, data: {
    coverLetter: string
    proposedRate?: number
    estimatedDays: number
  }) {
    const res = await apiClient.post(`/api/posts/${postId}/proposals`, data)
    return res.data
  },

  async getMyProposals() {
    const res = await apiClient.get('/api/posts/my-proposals')
    return res.data
  },

  async deletePost(id: string) {
    const res = await apiClient.delete(`/api/posts/${id}`)
    return res.data
  },

  async getPostLikers(postId: string) {
    const res = await apiClient.get(`/api/posts/${postId}/likers`)
    return res.data
  },

  async getMyPostLikers() {
    const res = await apiClient.get('/api/posts/my-likers')
    return res.data
  },

  async getUserPosts(userId: string) {
    const res = await apiClient.get(`/api/posts/user/${userId}`)
    return res.data
  },

  async getProposal(proposalId: string) {
    const res = await apiClient.get(`/api/posts/proposals/${proposalId}`)
    return res.data
  },

  async getReceivedProposals() {
    const res = await apiClient.get('/api/posts/received-proposals')
    return res.data
  },

  async acceptProposal(postId: string, proposalId: string) {
    const res = await apiClient.patch(`/api/posts/${postId}/proposals/${proposalId}/accept`)
    return res.data
  },

  async rejectProposal(postId: string, proposalId: string) {
    const res = await apiClient.patch(`/api/posts/${postId}/proposals/${proposalId}/reject`)
    return res.data
  },

  async withdrawProposal(postId: string, proposalId: string) {
    const res = await apiClient.patch(`/api/posts/${postId}/proposals/${proposalId}/withdraw`)
    return res.data
  },
}
