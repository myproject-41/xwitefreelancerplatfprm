import crypto from 'crypto'
import { prisma } from '../../config/db'
import { razorpay } from '../../config/razorpay'
import { env } from '../../config/env'

export class WalletService {

  private async ensureWallet(userId: string) {
    return prisma.wallet.upsert({
      where:  { userId },
      update: {},
      create: { userId, balance: 0, heldBalance: 0 },
    })
  }

  async getWallet(userId: string) {
    await this.ensureWallet(userId)
    return prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
  }

  /* ── Step 1: create a Razorpay order ── */
  async createOrder(userId: string, amount: number) {
    if (amount < 1) throw new Error('Minimum add amount is ₹1')

    await this.ensureWallet(userId)

    // Razorpay amount is in paise (smallest unit), so multiply by 100
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `w_${userId.slice(-12)}_${Date.now().toString().slice(-8)}`,
      notes:    { userId },
    })

    return {
      orderId:   order.id,
      amount:    order.amount,   // paise
      currency:  order.currency,
      keyId:     env.RAZORPAY_KEY_ID,
    }
  }

  /* ── Step 2: verify payment signature and credit wallet ── */
  async verifyPayment(
    userId:       string,
    razorpayOrderId:   string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    // Verify HMAC signature
    const body      = `${razorpayOrderId}|${razorpayPaymentId}`
    if (!env.RAZORPAY_KEY_SECRET) throw new Error('RAZORPAY_KEY_SECRET is not configured')
    const expected  = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expected !== razorpaySignature) {
      throw new Error('Payment verification failed — invalid signature')
    }

    // Fetch payment details from Razorpay to get the exact captured amount
    const payment = await razorpay.payments.fetch(razorpayPaymentId)
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new Error(`Payment not captured (status: ${payment.status})`)
    }

    const amountINR = Number(payment.amount) / 100   // paise → rupees

    // Check not already credited (idempotency)
    const existing = await prisma.walletTransaction.findFirst({
      where: { reference: razorpayPaymentId },
    })
    if (existing) return prisma.wallet.findUnique({ where: { userId } })

    const wallet = await this.ensureWallet(userId)

    const newBalance = wallet.balance + amountINR

    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          type:        'CREDIT',
          amount:      amountINR,
          description: `Funds added via Razorpay`,
          reference:   razorpayPaymentId,
          balanceAfter: newBalance,
        },
      }),
      prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      }),
    ])

    return prisma.wallet.findUnique({ where: { userId } })
  }

  /* ── Webhook handler (for robust server-side confirmation) ── */
  async handleWebhook(rawBody: string, signature: string) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured')
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    if (expected !== signature) throw new Error('Invalid webhook signature')

    const event = JSON.parse(rawBody)

    if (event.event === 'payment.captured') {
      const payment  = event.payload.payment.entity
      const userId   = payment.notes?.userId as string | undefined
      if (!userId) return

      // Check not already credited
      const existing = await prisma.walletTransaction.findFirst({
        where: { reference: payment.id },
      })
      if (existing) return

      const amountINR = Number(payment.amount) / 100
      const wallet    = await prisma.wallet.findUnique({ where: { userId } })
      if (!wallet) return

      const newBalance = wallet.balance + amountINR
      await prisma.$transaction([
        prisma.walletTransaction.create({
          data: {
            walletId:    wallet.id,
            type:        'CREDIT',
            amount:      amountINR,
            description: 'Funds added via Razorpay (webhook)',
            reference:   payment.id,
            balanceAfter: newBalance,
          },
        }),
        prisma.wallet.update({
          where: { userId },
          data: { balance: newBalance },
        }),
      ])
    }
  }

  /* ── Withdraw (manual payout — record intent, process offline) ── */
  async withdrawFunds(
    userId: string,
    amount: number,
    bankDetails?: {
      accountHolderName: string
      bankName:          string
      accountNumber:     string
      ifscCode:          string
    },
  ) {
    const wallet = await this.ensureWallet(userId)
    if (wallet.balance < amount) throw new Error('Insufficient balance')
    if (amount < 100) throw new Error('Minimum withdrawal amount is ₹100')

    const newBalance = wallet.balance - amount

    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          type:        'WITHDRAWAL',
          amount,
          description: 'Withdrawal requested — processing in 1–3 business days',
          balanceAfter: newBalance,
          ...(bankDetails ?? {}),
        },
      }),
      prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      }),
    ])

    return prisma.wallet.findUnique({ where: { userId } })
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.ensureWallet(userId)

    const skip = (page - 1) * limit
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ])

    return {
      wallet: { balance: wallet.balance, heldBalance: wallet.heldBalance },
      transactions,
      pagination: {
        total, page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }
  }
}

export const walletService = new WalletService()
