import crypto from 'crypto'
import { prisma } from '../../config/db'
import { razorpay } from '../../config/razorpay'
import { env } from '../../config/env'

export class WalletService {

  async getWallet(userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!wallet) throw new Error('Wallet not found')
    return wallet
  }

  /* ── Step 1: create a Razorpay order ── */
  async createOrder(userId: string, amount: number) {
    if (amount < 1) throw new Error('Minimum add amount is ₹1')

    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')

    // Razorpay amount is in paise (smallest unit), so multiply by 100
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `wallet_${userId}_${Date.now()}`,
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

    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')

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
  async withdrawFunds(userId: string, amount: number) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')
    if (wallet.balance < amount) throw new Error('Insufficient balance')

    const newBalance = wallet.balance - amount

    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          type:        'WITHDRAWAL',
          amount,
          description: 'Withdrawal requested — processing in 1–3 business days',
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

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')

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
