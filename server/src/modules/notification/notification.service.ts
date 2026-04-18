import { prisma } from '../../config/db'
import { getIO } from '../chat/socket'

interface CreateNotificationInput {
  userId: string
  type:
    | 'NEW_PROPOSAL'
    | 'PROPOSAL_ACCEPTED'
    | 'PROPOSAL_REJECTED'
    | 'TASK_ASSIGNED'
    | 'TASK_COMPLETED'
    | 'PAYMENT_RELEASED'
    | 'PAYMENT_RECEIVED'
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_ACCEPTED'
    | 'NEW_MESSAGE'
    | 'REVIEW_RECEIVED'
    | 'AGENT_MATCH'
    | 'ESCROW_FUNDED'
    | 'DISPUTE_OPENED'
    | 'DISPUTE_RESOLVED'
    | 'NEW_FOLLOW'
  entityId: string
  title: string
  message: string
  metadata?: unknown
  link?: string
}

export class NotificationService {
  async createNotification(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as any,
        entityId: input.entityId,
        title: input.title,
        message: input.message,
        metadata: input.metadata as any,
        link: input.link,
      },
    })

    // Push to user's personal socket room in real-time
    try {
      getIO().to(`user:${input.userId}`).emit('notification', notification)
    } catch {
      // Socket may not be initialized in tests
    }

    return notification
  }

  async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }
}

export const notificationService = new NotificationService()
