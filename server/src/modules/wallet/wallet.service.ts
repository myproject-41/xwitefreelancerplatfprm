import crypto from 'crypto'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { prisma } from '../../config/db'
import { razorpay } from '../../config/razorpay'
import { env } from '../../config/env'

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_ADD_AMOUNT_INR = 1
const MAX_ADD_AMOUNT_INR = 1_000_000          // ₹10 lakh per order
const MIN_WITHDRAW_INR   = 100

// Webhook processing outcome — controller maps these to HTTP status codes
export type WebhookOutcome =
  | { kind: 'processed' }
  | { kind: 'duplicate' }
  | { kind: 'ignored'; reason: string }
  | { kind: 'invalid_signature' }
  | { kind: 'transient_error'; error: string }
  | { kind: 'permanent_error'; error: string }

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
    if (!Number.isFinite(amount) || amount < MIN_ADD_AMOUNT_INR) {
      throw new Error(`Minimum add amount is ₹${MIN_ADD_AMOUNT_INR}`)
    }
    if (amount > MAX_ADD_AMOUNT_INR) {
      throw new Error(`Maximum add amount per order is ₹${MAX_ADD_AMOUNT_INR.toLocaleString('en-IN')}`)
    }

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Payment gateway not configured')
    }

    await this.ensureWallet(userId)

    // Collision-resistant receipt — UUID short form, prefixed for traceability
    const receipt = `w_${userId.slice(-8)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const amountPaise = Math.round(amount * 100)

    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt,
      notes:    { userId },
    })

    // Persist order so webhook/verify-payment can validate against it
    await prisma.razorpayOrder.create({
      data: {
        orderId:  order.id,
        userId,
        amount:   amountPaise,
        currency: 'INR',
        receipt,
        status:   'CREATED',
        notes:    { userId } as any,
      },
    })

    return {
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      keyId:     env.RAZORPAY_KEY_ID,
    }
  }

  /* ── Step 2: verify payment signature and credit wallet ── */
  async verifyPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    if (!env.RAZORPAY_KEY_SECRET) throw new Error('Payment gateway not configured')

    // 1. Verify HMAC signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')
    if (!safeEqual(expected, razorpaySignature)) {
      throw new Error('Payment verification failed — invalid signature')
    }

    // 2. Validate the order belongs to this user (defense against forged userId)
    const dbOrder = await prisma.razorpayOrder.findUnique({ where: { orderId: razorpayOrderId } })
    if (!dbOrder)               throw new Error('Order not recognised')
    if (dbOrder.userId !== userId) throw new Error('Order does not belong to user')

    // 3. Fetch payment from Razorpay to get the *actual* captured amount
    const payment = await razorpay.payments.fetch(razorpayPaymentId)
    if (payment.order_id !== razorpayOrderId) throw new Error('Payment / order mismatch')
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new Error(`Payment not captured (status: ${payment.status})`)
    }

    const amountINR = Number(payment.amount) / 100

    // 4. Credit wallet idempotently — credit() returns null if already processed
    await this.creditWallet({
      userId,
      paymentId: razorpayPaymentId,
      orderId:   razorpayOrderId,
      amountINR,
      source:    'verify-payment',
      description: 'Funds added via Razorpay',
    })

    // 5. Mark order paid (best-effort)
    await prisma.razorpayOrder.update({
      where: { orderId: razorpayOrderId },
      data:  { status: 'PAID', paymentId: razorpayPaymentId },
    }).catch(() => {})

    return prisma.wallet.findUnique({ where: { userId } })
  }

  /* ── Idempotent wallet credit ──
     Inserts ProcessedPayment row first (unique paymentId). If that fails with
     P2002 (unique violation), the payment was already credited — we exit
     cleanly. Otherwise we proceed with the credit inside a single transaction.
  */
  private async creditWallet(opts: {
    userId: string
    paymentId: string
    orderId?: string
    amountINR: number
    source: string
    description: string
  }) {
    try {
      await prisma.$transaction(async (tx) => {
        // Inserting here first acts as the idempotency lock.
        await tx.processedPayment.create({
          data: {
            paymentId: opts.paymentId,
            orderId:   opts.orderId,
            userId:    opts.userId,
            amount:    opts.amountINR,
            source:    opts.source,
          },
        })

        const wallet = await tx.wallet.upsert({
          where:  { userId: opts.userId },
          update: {},
          create: { userId: opts.userId, balance: 0, heldBalance: 0 },
        })

        const newBalance = wallet.balance + opts.amountINR

        await tx.walletTransaction.create({
          data: {
            walletId:     wallet.id,
            type:         'CREDIT',
            amount:       opts.amountINR,
            description:  opts.description,
            reference:    opts.paymentId,
            balanceAfter: newBalance,
          },
        })
        await tx.wallet.update({
          where: { userId: opts.userId },
          data:  { balance: newBalance },
        })
      })
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        // Already processed — that's fine, idempotent behaviour
        return
      }
      throw err
    }
  }

  /* ── Webhook handler ──
     Returns a structured outcome so the controller maps it to the right HTTP
     status. Razorpay retries non-2xx responses, so we MUST NOT 4xx on
     transient/processable errors.
  */
  async handleWebhook(rawBody: string, signature: string): Promise<WebhookOutcome> {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      return { kind: 'transient_error', error: 'Webhook secret not configured' }
    }

    // 1. Verify HMAC
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')
    if (!safeEqual(expected, signature)) {
      return { kind: 'invalid_signature' }
    }

    // 2. Parse
    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      // Malformed JSON — but signature was valid so this is suspicious. Don't
      // make Razorpay retry forever; mark permanent.
      return { kind: 'permanent_error', error: 'Malformed webhook payload' }
    }

    const eventType = event.event as string
    const eventId   = (event.id as string | undefined) ?? null

    // 3. Persist webhook event for audit
    let webhookRecord: { id: string } | null = null
    try {
      webhookRecord = await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          payload: event,
          signature,
          status:  'RECEIVED',
        },
        select: { id: true },
      })
    } catch {
      // Don't block processing on audit log failure
    }

    const finalize = async (
      status: 'PROCESSED' | 'IGNORED' | 'FAILED',
      errorMessage?: string,
    ) => {
      if (!webhookRecord) return
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data:  { status, processedAt: new Date(), errorMessage },
      }).catch(() => {})
    }

    try {
      switch (eventType) {
        case 'payment.captured':
        case 'payment.authorized': {
          const payment = event.payload?.payment?.entity
          if (!payment) {
            await finalize('IGNORED', 'No payment entity in payload')
            return { kind: 'ignored', reason: 'no payment entity' }
          }

          const orderId   = payment.order_id as string | undefined
          const paymentId = payment.id as string

          // Validate the order against our records
          const dbOrder = orderId
            ? await prisma.razorpayOrder.findUnique({ where: { orderId } })
            : null
          if (!dbOrder) {
            await finalize('IGNORED', `Unknown order ${orderId ?? '<none>'}`)
            return { kind: 'ignored', reason: 'unknown order' }
          }

          const amountINR = Number(payment.amount) / 100
          if (Math.round(amountINR * 100) !== dbOrder.amount) {
            await finalize('FAILED', `Amount mismatch: payment ${amountINR * 100} vs order ${dbOrder.amount}`)
            return { kind: 'permanent_error', error: 'Amount mismatch' }
          }

          await this.creditWallet({
            userId:    dbOrder.userId,
            paymentId,
            orderId,
            amountINR,
            source:    'webhook',
            description: 'Funds added via Razorpay (webhook)',
          })

          // Mark order paid
          await prisma.razorpayOrder.update({
            where: { orderId: dbOrder.orderId },
            data:  { status: 'PAID', paymentId },
          }).catch(() => {})

          await finalize('PROCESSED')
          return { kind: 'processed' }
        }

        case 'payment.failed': {
          const payment = event.payload?.payment?.entity
          const orderId = payment?.order_id as string | undefined
          if (orderId) {
            await prisma.razorpayOrder.updateMany({
              where: { orderId, status: 'CREATED' },
              data:  { status: 'FAILED' },
            }).catch(() => {})
          }
          await finalize('PROCESSED')
          return { kind: 'processed' }
        }

        case 'refund.processed':
        case 'refund.created': {
          // Future: implement refund flow. For now, just log.
          await finalize('IGNORED', 'Refund event — manual reconciliation required')
          return { kind: 'ignored', reason: 'refund not yet automated' }
        }

        default: {
          await finalize('IGNORED', `Unhandled event type: ${eventType}`)
          return { kind: 'ignored', reason: `unhandled ${eventType}` }
        }
      }
    } catch (err: any) {
      const message = err?.message ?? String(err)
      await finalize('FAILED', message)
      // Treat DB errors as transient so Razorpay retries
      return { kind: 'transient_error', error: message }
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
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_INR) {
      throw new Error(`Minimum withdrawal amount is ₹${MIN_WITHDRAW_INR}`)
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where:  { userId },
        update: {},
        create: { userId, balance: 0, heldBalance: 0 },
      })
      if (wallet.balance < amount) throw new Error('Insufficient balance')

      const newBalance = wallet.balance - amount

      await tx.walletTransaction.create({
        data: {
          walletId:     wallet.id,
          type:         'WITHDRAWAL',
          amount,
          description:  'Withdrawal requested — processing in 1–3 business days',
          balanceAfter: newBalance,
          ...(bankDetails ?? {}),
        },
      })
      await tx.wallet.update({
        where: { userId },
        data:  { balance: newBalance },
      })

      return tx.wallet.findUnique({ where: { userId } })
    })
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.ensureWallet(userId)

    const skip = (page - 1) * limit
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where:   { walletId: wallet.id },
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
        hasMore:    page * limit < total,
      },
    }
  }
}

// Constant-time string equality for HMAC comparisons
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

export const walletService = new WalletService()
