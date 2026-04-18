import apiClient from './apiClient'

export const notificationService = {
  async getNotifications() {
    const res = await apiClient.get('/api/notifications')
    return res.data
  },

  async markAsRead(notificationId: string) {
    const res = await apiClient.patch(`/api/notifications/${notificationId}/read`)
    return res.data
  },

  async markAllAsRead() {
    const res = await apiClient.patch('/api/notifications/read-all')
    return res.data
  },
}
