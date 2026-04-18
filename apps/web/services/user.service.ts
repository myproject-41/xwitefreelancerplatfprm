import apiClient from './apiClient'

export const userService = {
  async getMyProfile() {
    const res = await apiClient.get('/api/users/me')
    return res.data
  },

  async getPublicProfile(userId: string) {
    const res = await apiClient.get(`/api/users/${userId}`)
    return res.data
  },

  async updateFreelancerProfile(data: any) {
    const res = await apiClient.put('/api/users/profile/freelancer', data)
    return res.data
  },

  async updateCompanyProfile(data: any) {
    const res = await apiClient.put('/api/users/profile/company', data)
    return res.data
  },

  async updateClientProfile(data: any) {
    const res = await apiClient.put('/api/users/profile/client', data)
    return res.data
  },
}