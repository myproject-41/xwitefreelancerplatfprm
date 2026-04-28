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

  async sendRequest(toUserId: string, taskTitle: string) {
    const res = await apiClient.post('/api/agent/send-request', { toUserId, taskTitle })
    return res.data
  },
}
