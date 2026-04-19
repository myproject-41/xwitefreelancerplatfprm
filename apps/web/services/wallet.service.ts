import apiClient from './apiClient'

export const walletService = {
  async getWallet() {
    const res = await apiClient.get('/api/wallet')
    return res.data
  },

  async createOrder(amount: number) {
    const res = await apiClient.post('/api/wallet/create-order', { amount })
    return res.data
  },

  async verifyPayment(payload: {
    razorpayOrderId:   string
    razorpayPaymentId: string
    razorpaySignature: string
  }) {
    const res = await apiClient.post('/api/wallet/verify-payment', payload)
    return res.data
  },

  async withdrawFunds(payload: {
    amount:            number
    accountHolderName: string
    bankName:          string
    accountNumber:     string
    ifscCode:          string
  }) {
    const res = await apiClient.post('/api/wallet/withdraw', payload)
    return res.data
  },

  async getTransactions(page = 1) {
    const res = await apiClient.get('/api/wallet/transactions', { params: { page } })
    return res.data
  },
}
