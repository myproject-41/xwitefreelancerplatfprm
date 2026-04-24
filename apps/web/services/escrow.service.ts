import apiClient from './apiClient'

export const escrowService = {
  async getMyEscrows() {
    const res = await apiClient.get('/api/escrow/my')
    return res.data
  },

  async getEscrow(escrowId: string) {
    const res = await apiClient.get(`/api/escrow/${escrowId}`)
    return res.data
  },

  async fundEscrow(escrowId: string) {
    const res = await apiClient.post(`/api/escrow/${escrowId}/fund`)
    return res.data
  },

  async submitWork(escrowId: string, submissionNote: string, submissionFiles: string[]) {
    const res = await apiClient.post(`/api/escrow/${escrowId}/submit`, { submissionNote, submissionFiles })
    return res.data
  },

  async releaseEscrow(escrowId: string) {
    const res = await apiClient.post(`/api/escrow/${escrowId}/release`)
    return res.data
  },

  async requestRevision(escrowId: string, revisionNote: string, revisionImage?: string) {
    const res = await apiClient.post(`/api/escrow/${escrowId}/revision`, { revisionNote, revisionImage })
    return res.data
  },

  async openDispute(escrowId: string, reason: string) {
    const res = await apiClient.post(`/api/escrow/${escrowId}/dispute`, { reason })
    return res.data
  },

  async cancelEscrow(escrowId: string) {
    const res = await apiClient.delete(`/api/escrow/${escrowId}/cancel`)
    return res.data
  },

  async getFreelancerCompletedTasks(userId: string) {
    const res = await apiClient.get(`/api/escrow/freelancer/${userId}/completed`)
    return res.data
  },

  async getClientSpend(userId: string) {
    const res = await apiClient.get(`/api/escrow/client/${userId}/spend`)
    return res.data
  },
}
