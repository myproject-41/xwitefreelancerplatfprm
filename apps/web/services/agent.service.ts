import apiClient from './apiClient'

export const agentService = {
  async findTasks() {
    const res = await apiClient.get('/api/agent/find-tasks')
    return res.data
  },

  async findFreelancers(postId: string) {
    const res = await apiClient.get(`/api/agent/find-freelancers/${postId}`)
    return res.data
  },

  async getMyPosts() {
    const res = await apiClient.get('/api/agent/my-posts')
    return res.data
  },

  async generateProposal(postId: string) {
    const res = await apiClient.post('/api/agent/generate-proposal', { postId })
    return res.data
  },

  async generateInvite(postId: string, freelancerId: string) {
    const res = await apiClient.post('/api/agent/generate-invite', { postId, freelancerId })
    return res.data
  },

  async notifyFreelancer(postId: string, freelancerId: string) {
    const res = await apiClient.post('/api/agent/notify-freelancer', { postId, freelancerId })
    return res.data
  },
}
