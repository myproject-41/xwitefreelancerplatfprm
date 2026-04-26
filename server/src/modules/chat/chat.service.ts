import prisma from '../../config/db'
import { notificationService } from '../notification/notification.service'
import { getOrCreateConversation } from './conversation.service'
import { getIO } from './socket'

function getUserDisplayName(user: any) {
  return (
    user?.freelancerProfile?.fullName ||
    user?.companyProfile?.companyName ||
    user?.clientProfile?.fullName ||
    user?.email ||
    'Someone'
  )
}

export class ChatService {
  async listConversations(userId: string) {
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc',
        },
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    freelancerProfile: {
                      select: { fullName: true, title: true, profileImage: true },
                    },
                    companyProfile: {
                      select: { companyName: true, industry: true, profileImage: true },
                    },
                    clientProfile: {
                      select: { fullName: true, profileImage: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    return conversations.map((participant) => {
      const otherParticipant = participant.conversation.participants.find(
        (entry) => entry.userId !== userId
      )

      return {
        conversationId: participant.conversationId,
        unreadCount: participant.unreadCount,
        lastMessage: participant.conversation.lastMessage,
        lastMessageAt: participant.conversation.lastMessageAt,
        participant: otherParticipant
          ? {
              id: otherParticipant.user.id,
              role: otherParticipant.user.role,
              name: getUserDisplayName(otherParticipant.user),
              title:
                otherParticipant.user.freelancerProfile?.title ||
                otherParticipant.user.companyProfile?.industry ||
                otherParticipant.user.role,
              profileImage:
                otherParticipant.user.freelancerProfile?.profileImage ||
                otherParticipant.user.companyProfile?.profileImage ||
                otherParticipant.user.clientProfile?.profileImage ||
                null,
            }
          : null,
      }
    })
  }

  async getOrCreateConversationBetweenUsers(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new Error('Cannot create a conversation with yourself')
    }

    // Companies can be messaged by anyone — check role first
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { role: true },
    })

    if (otherUser?.role !== 'COMPANY') {
      // Only allow chat between connected users or accepted-proposal pairs
      const [connection, acceptedProposal] = await Promise.all([
        prisma.connection.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { fromUserId: userId, toUserId: otherUserId },
              { fromUserId: otherUserId, toUserId: userId },
            ],
          },
        }),
        prisma.proposal.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { freelancerId: userId, post: { clientId: otherUserId } },
              { freelancerId: otherUserId, post: { clientId: userId } },
            ],
          },
        }),
      ])

      if (!connection && !acceptedProposal) {
        throw new Error('You can only chat with people you are connected with or have an accepted proposal with')
      }
    }

    return getOrCreateConversation(userId, otherUserId)
  }

  async getConversationMessages(conversationId: string, userId: string) {
    await this.assertConversationParticipant(conversationId, userId)

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            freelancerProfile: { select: { fullName: true, profileImage: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
            clientProfile: { select: { fullName: true, profileImage: true } },
          },
        },
      },
    })

    await this.markConversationAsRead(conversationId, userId)

    return messages.map((message) => ({
      id: message.id,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
      senderId: message.senderId,
      senderName: getUserDisplayName(message.sender),
      senderProfileImage:
        message.sender.freelancerProfile?.profileImage ||
        message.sender.companyProfile?.profileImage ||
        message.sender.clientProfile?.profileImage ||
        null,
    }))
  }

  async sendConversationMessage(input: {
    conversationId: string
    senderId: string
    content: string
  }) {
    const participant = await this.assertConversationParticipant(input.conversationId, input.senderId)

    const message = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
      },
    })

    // For structured messages (e.g. PROPOSAL cards) show a friendly preview
    let lastMessagePreview = input.content
    if (input.content.startsWith('{')) {
      try {
        const parsed = JSON.parse(input.content)
        if (parsed.__type === 'PROPOSAL') {
          lastMessagePreview = `📋 Proposal for "${parsed.postTitle}"`
        }
      } catch {}
    }

    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessage: lastMessagePreview,
        lastMessageAt: new Date(),
      },
    })

    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: input.conversationId,
        NOT: { userId: input.senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    })

    const sender = await prisma.user.findUnique({
      where: { id: input.senderId },
      select: {
        email: true,
        freelancerProfile: { select: { fullName: true, profileImage: true } },
        companyProfile: { select: { companyName: true, profileImage: true } },
        clientProfile: { select: { fullName: true, profileImage: true } },
      },
    })

    const recipientIds = participant.conversation.participants
      .filter((entry) => entry.userId !== input.senderId)
      .map((entry) => entry.userId)

    const senderName = getUserDisplayName(sender)
    const payload = {
      id: message.id,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
      senderId: input.senderId,
      senderName,
      senderProfileImage:
        sender?.freelancerProfile?.profileImage ||
        sender?.companyProfile?.profileImage ||
        sender?.clientProfile?.profileImage ||
        null,
      conversationId: input.conversationId,
    }

    await Promise.all(
      recipientIds.map((recipientId) =>
        notificationService.createNotification({
          userId: recipientId,
          type: 'NEW_MESSAGE',
          entityId: input.conversationId,
          title: 'New message',
          message: `${senderName} sent you a message.`,
          metadata: {
            conversationId: input.conversationId,
            senderId: input.senderId,
          },
          link: `/messages?conversationId=${input.conversationId}`,
        })
      )
    )

    try {
      getIO().to(input.conversationId).emit('new_message', payload)
    } catch {
      // Socket may not be initialized in tests or restricted environments.
    }

    return payload
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    await this.assertConversationParticipant(conversationId, userId)

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
      },
      data: { isRead: true },
    })

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { unreadCount: 0 },
    })
  }

  private async assertConversationParticipant(conversationId: string, userId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    })

    if (!participant) {
      throw new Error('Conversation not found')
    }

    return participant
  }
}

export const chatService = new ChatService()
