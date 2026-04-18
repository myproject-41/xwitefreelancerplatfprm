import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'

export class EscrowService {

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

    return prisma.escrow.create({
      data: {
        taskId,
        clientId,
        freelancerId,
        amount,
        platformFee: 0,
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
      await tx.$executeRaw`
        UPDATE "escrows"
        SET status = 'REVIEW', "revisionNote" = NULL, "revisionImage" = NULL, "updatedAt" = NOW()
        WHERE id = ${escrowId}
      `
      await tx.$executeRaw`
        UPDATE "tasks"
        SET status = 'UNDER_REVIEW', "submissionNote" = ${submissionNote}, "submissionFiles" = ${submissionFiles}, "updatedAt" = NOW()
        WHERE id = ${escrow.taskId}
      `
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
    const [revRow] = await prisma.$queryRaw<Array<{ revisionCount: number }>>`
      SELECT "revisionCount" FROM "escrows" WHERE id = ${escrowId}
    `
    if ((revRow?.revisionCount ?? 0) >= 2) throw new Error('Maximum 2 revision requests allowed per task')

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "escrows"
        SET status = 'REVISION',
            "revisionNote" = ${revisionNote},
            "revisionImage" = ${revisionImage ?? null},
            "revisionCount" = "revisionCount" + 1,
            "updatedAt" = NOW()
        WHERE id = ${escrowId}
      `
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

    await prisma.$transaction(async (tx) => {
      const freelancerWallet = await tx.wallet.findUnique({ where: { userId: escrow.freelancerId } })
      if (!freelancerWallet) throw new Error('Freelancer wallet not found')

      const amount = escrow.amount // 0% platform fee

      await tx.wallet.update({
        where: { userId: clientId },
        data: { heldBalance: { decrement: amount } },
      })

      const newFreelancerBalance = freelancerWallet.balance + amount

      await tx.wallet.update({
        where: { userId: escrow.freelancerId },
        data: { balance: { increment: amount } },
      })

      await tx.walletTransaction.create({
        data: {
          walletId:     freelancerWallet.id,
          type:         'ESCROW_RELEASE',
          amount,
          description:  `Payment received for: ${escrow.task.title}`,
          reference:    escrowId,
          balanceAfter: newFreelancerBalance,
        },
      })

      await tx.escrow.update({
        where: { id: escrowId },
        data: { status: 'RELEASED', releasedAt: new Date() },
      })

      await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'COMPLETED' } })

      if (escrow.task.postId) {
        await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'COMPLETED' } })
      }

      await tx.freelancerProfile.updateMany({
        where: { userId: escrow.freelancerId },
        data: { totalEarnings: { increment: amount } },
      })
    })

    await Promise.all([
      notificationService.createNotification({
        userId:   escrow.freelancerId,
        type:     'PAYMENT_RECEIVED',
        entityId: escrowId,
        title:    'Payment received!',
        message:  `₹${escrow.amount} has been released to your wallet for "${escrow.task.title}".`,
        link:     `/wallet`,
      }),
      notificationService.createNotification({
        userId:   clientId,
        type:     'PAYMENT_RELEASED',
        entityId: escrowId,
        title:    'Payment released',
        message:  `₹${escrow.amount} released to freelancer for "${escrow.task.title}".`,
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

    await prisma.$transaction(async (tx) => {
      if (winner === 'FREELANCER') {
        const fw = await tx.wallet.findUnique({ where: { userId: escrow.freelancerId } })
        if (!fw) throw new Error('Freelancer wallet not found')

        await tx.wallet.update({
          where: { userId: escrow.clientId },
          data: { heldBalance: { decrement: escrow.amount } },
        })
        await tx.wallet.update({
          where: { userId: escrow.freelancerId },
          data: { balance: { increment: escrow.amount } },
        })
        await tx.walletTransaction.create({
          data: {
            walletId:     fw.id,
            type:         'ESCROW_RELEASE',
            amount:       escrow.amount,
            description:  `Dispute resolved in your favour for: ${escrow.task.title}`,
            reference:    escrowId,
            balanceAfter: fw.balance + escrow.amount,
          },
        })
        await tx.freelancerProfile.updateMany({
          where: { userId: escrow.freelancerId },
          data: { totalEarnings: { increment: escrow.amount } },
        })
        await tx.escrow.update({
          where: { id: escrowId },
          data: { status: 'RELEASED', releasedAt: new Date(), resolvedBy: adminId },
        })
        await tx.task.update({ where: { id: escrow.taskId }, data: { status: 'COMPLETED' } })
        if (escrow.task.postId) {
          await tx.post.update({ where: { id: escrow.task.postId }, data: { status: 'COMPLETED' } })
        }
      } else {
        // Refund client
        const cw = await tx.wallet.findUnique({ where: { userId: escrow.clientId } })
        if (!cw) throw new Error('Client wallet not found')

        await tx.wallet.update({
          where: { userId: escrow.clientId },
          data: {
            balance:     { increment: escrow.amount },
            heldBalance: { decrement: escrow.amount },
          },
        })
        await tx.walletTransaction.create({
          data: {
            walletId:     cw.id,
            type:         'REFUND',
            amount:       escrow.amount,
            description:  `Refund after dispute resolved for: ${escrow.task.title}`,
            reference:    escrowId,
            balanceAfter: cw.balance + escrow.amount,
          },
        })
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

    const [extraEscrow] = await prisma.$queryRaw<Array<{
      status: string; revisionNote: string | null; revisionImage: string | null; revisionCount: number
    }>>`SELECT status, "revisionNote", "revisionImage", "revisionCount" FROM "escrows" WHERE id = ${escrowId}`

    const [extraTask] = await prisma.$queryRaw<Array<{
      submissionNote: string | null; submissionFiles: string[]
    }>>`SELECT "submissionNote", "submissionFiles" FROM "tasks" WHERE id = ${escrow.taskId}`

    return {
      ...escrow,
      status: (extraEscrow?.status ?? escrow.status) as any,
      revisionNote: extraEscrow?.revisionNote ?? null,
      revisionImage: extraEscrow?.revisionImage ?? null,
      revisionCount: extraEscrow?.revisionCount ?? 0,
      task: {
        ...escrow.task,
        submissionNote: extraTask?.submissionNote ?? null,
        submissionFiles: extraTask?.submissionFiles ?? [],
      },
    }
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
