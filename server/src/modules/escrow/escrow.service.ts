import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'

export class EscrowService {
  private calculatePlatformFee(amount: number) {
    return Math.max(0, Math.round(amount * 0.1))
  }

  private getEscrowBreakdown(escrow: { amount: number; platformFee: number }) {
    const platformFee = escrow.platformFee > 0 ? escrow.platformFee : this.calculatePlatformFee(escrow.amount)

    return {
      clientPays: escrow.amount,
      platformFee,
      freelancerPayout: Math.max(0, escrow.amount - platformFee),
    }
  }

  private async refundClientHeldEscrow(
    tx: any,
    escrow: { amount: number; clientId: string; task: { title: string } },
    escrowId: string,
    description: string,
  ) {
    const clientWallet = await tx.wallet.findUnique({ where: { userId: escrow.clientId } })
    if (!clientWallet) throw new Error('Client wallet not found')

    await tx.wallet.update({
      where: { userId: escrow.clientId },
      data: {
        balance: { increment: escrow.amount },
        heldBalance: { decrement: escrow.amount },
      },
    })

    await tx.walletTransaction.create({
      data: {
        walletId: clientWallet.id,
        type: 'REFUND',
        amount: escrow.amount,
        description,
        reference: escrowId,
        balanceAfter: clientWallet.balance + escrow.amount,
      },
    })
  }

  /* ── ensure wallet exists for a user ── */
  private async ensureWallet(userId: string) {
    const existing = await prisma.wallet.findUnique({ where: { userId } })
    if (existing) return existing
    return prisma.wallet.create({ data: { userId, balance: 0, heldBalance: 0 } })
  }

  /* ══════════════════════════════════════
     CREATE  (called when proposal accepted)
  ══════════════════════════════════════ */
  async createEscrow(
    taskId: string,
    clientId: string,
    freelancerId: string,
    amount: number,
  ) {
    await Promise.all([this.ensureWallet(clientId), this.ensureWallet(freelancerId)])
    const platformFee = this.calculatePlatformFee(amount)

    return prisma.escrow.create({
      data: {
        taskId,
        clientId,
        freelancerId,
        amount,
        platformFee,
        status: 'CREATED',
      },
    })
  }

  /* ══════════════════════════════════════
     FUND  (client pays from wallet balance)
  ══════════════════════════════════════ */
  async fundEscrow(escrowId: string, clientId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== clientId) throw new Error('Not authorized')
    if (escrow.status !== 'CREATED') throw new Error('Escrow is already funded or completed')

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: clientId } })
      if (!wallet) throw new Error('Wallet not found. Please contact support.')
      if (wallet.balance < escrow.amount) throw new Error('Insufficient wallet balance')

      const newBalance = wallet.balance - escrow.amount
      const newHeld   = wallet.heldBalance + escrow.amount

      await tx.wallet.update({
        where: { userId: clientId },
        data: { balance: newBalance, heldBalance: newHeld },
      })

      await tx.walletTransaction.create({
        data: {
          walletId:     wallet.id,
          type:         'ESCROW_HOLD',
          amount:       escrow.amount,
          description:  `Escrow funded for: ${escrow.task.title}`,
          reference:    escrowId,
          balanceAfter: newBalance,
        },
      })

      await tx.escrow.update({ where: { id: escrowId }, data: { status: 'FUNDED' } })
      await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'IN_PROGRESS' } })
      if (escrow.task.postId) {
        await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'IN_PROGRESS' } })
      }

      return tx.escrow.findUnique({
        where: { id: escrowId },
        include: { task: true, client: { select: { id: true } }, freelancer: { select: { id: true } } },
      })
    })

    await notificationService.createNotification({
      userId:   escrow.freelancerId,
      type:     'ESCROW_FUNDED',
      entityId: escrowId,
      title:    'Escrow funded — you can start working!',
      message:  `₹${escrow.amount} is secured in escrow for "${escrow.task.title}".`,
      link:     `/payment/escrow/${escrowId}`,
    })

    return result
  }

  /* ══════════════════════════════════════
     SUBMIT WORK  (freelancer marks done)
  ══════════════════════════════════════ */
  async submitWork(escrowId: string, freelancerId: string, submissionNote: string, submissionFiles: string[]) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.freelancerId !== freelancerId) throw new Error('Not authorized')
    if (!['FUNDED', 'IN_PROGRESS', 'REVISION'].includes(escrow.status)) {
      throw new Error('Cannot submit work in the current escrow state')
    }

    await prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { id: escrowId },
        data: { status: 'REVIEW', revisionNote: null, revisionImage: null },
      })
      await tx.task.update({
        where: { id: escrow.taskId },
        data: { status: 'UNDER_REVIEW', submissionNote, submissionFiles },
      })
    })

    await notificationService.createNotification({
      userId:   escrow.clientId,
      type:     'TASK_COMPLETED',
      entityId: escrowId,
      title:    'Work submitted for review',
      message:  `Freelancer submitted work for "${escrow.task.title}". Review and release payment.`,
      link:     `/payment/escrow/${escrowId}`,
    })

    return prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
  }

  /* ══════════════════════════════════════
     REQUEST REVISION  (client asks for changes)
  ══════════════════════════════════════ */
  async requestRevision(escrowId: string, clientId: string, revisionNote: string, revisionImage?: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== clientId) throw new Error('Not authorized')
    if (escrow.status !== 'REVIEW') throw new Error('Can only request revision when work is under review')
    if ((escrow.revisionCount ?? 0) >= 2) throw new Error('Maximum 2 revision requests allowed per task')

    await prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { id: escrowId },
        data: {
          status: 'REVISION',
          revisionNote,
          revisionImage: revisionImage ?? null,
          revisionCount: { increment: 1 },
        },
      })
      await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'IN_PROGRESS' } })
    })

    await notificationService.createNotification({
      userId:   escrow.freelancerId,
      type:     'TASK_COMPLETED',
      entityId: escrowId,
      title:    '🔄 Revision requested',
      message:  `Client requested changes for "${escrow.task.title}": ${revisionNote.slice(0, 100)}${revisionNote.length > 100 ? '…' : ''}`,
      link:     `/payment/escrow/${escrowId}`,
      metadata: { revisionNote, revisionImage: revisionImage ?? null },
    })

    return prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
  }

  /* ══════════════════════════════════════
     RELEASE  (client approves, pays freelancer)
  ══════════════════════════════════════ */
  async releaseEscrow(escrowId: string, clientId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== clientId) throw new Error('Not authorized')
    if (escrow.status !== 'REVIEW') throw new Error('Escrow must be in REVIEW state to release')
    const { clientPays, freelancerPayout, platformFee } = this.getEscrowBreakdown(escrow)

    await prisma.$transaction(async (tx) => {
      const freelancerWallet = await tx.wallet.findUnique({ where: { userId: escrow.freelancerId } })
      if (!freelancerWallet) throw new Error('Freelancer wallet not found')

      await tx.wallet.update({
        where: { userId: clientId },
        data: { heldBalance: { decrement: clientPays } },
      })

      const newFreelancerBalance = freelancerWallet.balance + freelancerPayout

      await tx.wallet.update({
        where: { userId: escrow.freelancerId },
        data: { balance: { increment: freelancerPayout } },
      })

      await tx.walletTransaction.create({
        data: {
          walletId:     freelancerWallet.id,
          type:         'ESCROW_RELEASE',
          amount:       freelancerPayout,
          description:  `Payment received for: ${escrow.task.title}`,
          reference:    escrowId,
          balanceAfter: newFreelancerBalance,
        },
      })

      await tx.escrow.update({
        where: { id: escrowId },
        data: { status: 'RELEASED', releasedAt: new Date(), platformFee },
      })

      await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'COMPLETED' } })

      if (escrow.task.postId) {
        await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'COMPLETED' } })
      }

      await tx.freelancerProfile.updateMany({
        where: { userId: escrow.freelancerId },
        data: { totalEarnings: { increment: freelancerPayout } },
      })
    })

    await Promise.all([
      notificationService.createNotification({
        userId:   escrow.freelancerId,
        type:     'PAYMENT_RECEIVED',
        entityId: escrowId,
        title:    'Payment received!',
        message:  `₹${freelancerPayout} has been released to your wallet for "${escrow.task.title}" after a ₹${platformFee} platform fee.`,
        link:     `/wallet`,
      }),
      notificationService.createNotification({
        userId:   clientId,
        type:     'PAYMENT_RELEASED',
        entityId: escrowId,
        title:    'Payment released',
        message:  `₹${freelancerPayout} released to freelancer for "${escrow.task.title}". Platform fee: ₹${platformFee}.`,
        link:     `/payment/escrow/${escrowId}`,
      }),
    ])

    return prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
  }

  /* ══════════════════════════════════════
     DISPUTE  (either party raises a dispute)
  ══════════════════════════════════════ */
  async openDispute(escrowId: string, userId: string, reason: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== userId && escrow.freelancerId !== userId) {
      throw new Error('Not authorized')
    }
    if (!['FUNDED', 'IN_PROGRESS', 'REVIEW'].includes(escrow.status)) {
      throw new Error('Cannot raise a dispute in the current escrow state')
    }

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'DISPUTED', disputeReason: reason },
    })

    const otherUserId = escrow.clientId === userId ? escrow.freelancerId : escrow.clientId

    await notificationService.createNotification({
      userId:   otherUserId,
      type:     'DISPUTE_OPENED',
      entityId: escrowId,
      title:    'Dispute raised',
      message:  `A dispute has been raised for "${escrow.task.title}". Admin will review shortly.`,
      link:     `/payment/escrow/${escrowId}`,
    })

    return prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
  }

  /* ══════════════════════════════════════
     RESOLVE DISPUTE  (admin only)
  ══════════════════════════════════════ */
  async resolveDispute(escrowId: string, adminId: string, winner: 'CLIENT' | 'FREELANCER') {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { task: true },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.status !== 'DISPUTED') throw new Error('Escrow is not in DISPUTED state')
    const { clientPays, freelancerPayout, platformFee } = this.getEscrowBreakdown(escrow)

    await prisma.$transaction(async (tx) => {
      if (winner === 'FREELANCER') {
        const fw = await tx.wallet.findUnique({ where: { userId: escrow.freelancerId } })
        if (!fw) throw new Error('Freelancer wallet not found')

        await tx.wallet.update({
          where: { userId: escrow.clientId },
          data: { heldBalance: { decrement: clientPays } },
        })
        await tx.wallet.update({
          where: { userId: escrow.freelancerId },
          data: { balance: { increment: freelancerPayout } },
        })
        await tx.walletTransaction.create({
          data: {
            walletId:     fw.id,
            type:         'ESCROW_RELEASE',
            amount:       freelancerPayout,
            description:  `Dispute resolved in your favour for: ${escrow.task.title}`,
            reference:    escrowId,
            balanceAfter: fw.balance + freelancerPayout,
          },
        })
        await tx.freelancerProfile.updateMany({
          where: { userId: escrow.freelancerId },
          data: { totalEarnings: { increment: freelancerPayout } },
        })
        await tx.escrow.update({
          where: { id: escrowId },
          data: { status: 'RELEASED', releasedAt: new Date(), resolvedBy: adminId, platformFee },
        })
        await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'COMPLETED' } })
        if (escrow.task.postId) {
          await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'COMPLETED' } })
        }
      } else {
        await this.refundClientHeldEscrow(tx, escrow, escrowId, `Refund after dispute resolved for: ${escrow.task.title}`)
        await tx.escrow.update({
          where: { id: escrowId },
          data: { status: 'REFUNDED', resolvedBy: adminId },
        })
        await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'CANCELLED' } })
        if (escrow.task.postId) {
          await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'CLOSED' } })
        }
      }
    })

    await Promise.all([
      notificationService.createNotification({
        userId:   escrow.clientId,
        type:     'DISPUTE_RESOLVED',
        entityId: escrowId,
        title:    'Dispute resolved',
        message:  `The dispute for "${escrow.task.title}" has been resolved by admin.`,
        link:     `/payment/escrow/${escrowId}`,
      }),
      notificationService.createNotification({
        userId:   escrow.freelancerId,
        type:     'DISPUTE_RESOLVED',
        entityId: escrowId,
        title:    'Dispute resolved',
        message:  `The dispute for "${escrow.task.title}" has been resolved by admin.`,
        link:     `/payment/escrow/${escrowId}`,
      }),
    ])

    return prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
  }

  /* ══════════════════════════════════════
     CANCEL  (client cancels before funding)
  ══════════════════════════════════════ */
  async cancelEscrow(escrowId: string, clientId: string) {
    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId }, include: { task: true } })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== clientId) throw new Error('Not authorized')
    if (escrow.status !== 'CREATED') throw new Error('Can only cancel an unfunded escrow')

    await prisma.$transaction(async (tx) => {
      await tx.escrow.update({ where: { id: escrowId }, data: { status: 'REFUNDED' } })
      await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'CANCELLED' } })
      if (escrow.task.postId) {
        await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'OPEN' } })
      }
    })

    return { success: true }
  }

  /* ══════════════════════════════════════
     GET SINGLE  (both parties can view)
  ══════════════════════════════════════ */
  async getEscrow(escrowId: string, userId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        task: true,
        client: {
          select: {
            id: true,
            role: true,
            clientProfile:  { select: { fullName: true, profileImage: true, companyName: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
          },
        },
        freelancer: {
          select: {
            id: true,
            role: true,
            freelancerProfile: { select: { fullName: true, profileImage: true, title: true } },
          },
        },
      },
    })
    if (!escrow) throw new Error('Escrow not found')
    if (escrow.clientId !== userId && escrow.freelancerId !== userId) {
      throw new Error('Not authorized')
    }
    return escrow
  }

  /* ══════════════════════════════════════
     FREELANCER PUBLIC COMPLETED TASKS
  ══════════════════════════════════════ */
  async getFreelancerCompletedTasks(freelancerId: string) {
    return prisma.escrow.findMany({
      where: { freelancerId, status: 'RELEASED' },
      include: {
        task: {
          select: {
            id: true, title: true, description: true,
            skills: true, createdAt: true,
            post: { select: { id: true, type: true } },
          },
        },
        client: {
          select: {
            id: true,
            clientProfile:  { select: { fullName: true, profileImage: true, companyName: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  /* ══════════════════════════════════════
     LIST MY ESCROWS
  ══════════════════════════════════════ */
  async getMyEscrows(userId: string) {
    return prisma.escrow.findMany({
      where: { OR: [{ clientId: userId }, { freelancerId: userId }] },
      include: {
        task: { select: { id: true, title: true, description: true, deadline: true } },
        client: {
          select: {
            id: true,
            role: true,
            clientProfile:  { select: { fullName: true, profileImage: true, companyName: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
          },
        },
        freelancer: {
          select: {
            id: true,
            role: true,
            freelancerProfile: { select: { fullName: true, profileImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const escrowService = new EscrowService()
