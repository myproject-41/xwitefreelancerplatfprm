import apiClient from './apiClient'

export const chatService = {
  async getConversations() {
    const res = await apiClient.get('/api/chat/conversations')
    return res.data
  },

  async getOrCreateConversation(userId: string) {
    const res = await apiClient.post(`/api/chat/conversations/with/${userId}`)
    return res.data
  },

  async getMessages(conversationId: string) {
    const res = await apiClient.get(`/api/chat/conversations/${conversationId}/messages`)
    return res.data
  },

  async sendMessage(conversationId: string, content: string) {
    const res = await apiClient.post(`/api/chat/conversations/${conversationId}/messages`, {
      content,
    })
    return res.data
  },

  async markAsRead(conversationId: string) {
    const res = await apiClient.patch(`/api/chat/conversations/${conversationId}/read`)
    return res.data
  },
}
