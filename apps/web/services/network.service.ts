import apiClient from './apiClient'

export const networkService = {
  async getSuggestions() {
    const res = await apiClient.get('/api/network/suggestions')
    return res.data
  },

  async getPendingRequests() {
    const res = await apiClient.get('/api/network/pending')
    return res.data
  },

  async getConnections(search?: string) {
    const res = await apiClient.get('/api/network/connections', {
      params: search ? { search } : {},
    })
    return res.data
  },

  async sendRequest(userId: string) {
    const res = await apiClient.post(`/api/network/connect/${userId}`)
    return res.data
  },

  async acceptRequest(connectionId: string) {
    const res = await apiClient.patch(`/api/network/accept/${connectionId}`)
    return res.data
  },

  async rejectRequest(connectionId: string) {
    const res = await apiClient.patch(`/api/network/reject/${connectionId}`)
    return res.data
  },

  async removeConnection(connectionId: string) {
    const res = await apiClient.delete(`/api/network/remove/${connectionId}`)
    return res.data
  },

  async follow(userId: string) {
    const res = await apiClient.post(`/api/network/follow/${userId}`)
    return res.data
  },

  async unfollow(userId: string) {
    const res = await apiClient.delete(`/api/network/unfollow/${userId}`)
    return res.data
  },

  async getFollowing() {
    const res = await apiClient.get('/api/network/following')
    return res.data
  },

  async isFollowing(userId: string) {
    const res = await apiClient.get(`/api/network/is-following/${userId}`)
    return res.data
  },

  async getFollowers() {
    const res = await apiClient.get('/api/network/followers')
    return res.data
  },
}
