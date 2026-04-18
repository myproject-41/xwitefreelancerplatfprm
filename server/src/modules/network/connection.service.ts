import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'
import { getOrCreateConversation } from '../chat/conversation.service'

export class ConnectionService {
  // Send connection request
  async sendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) throw new Error('Cannot connect with yourself')

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') throw new Error('Already connected')
      if (existing.status === 'PENDING') throw new Error('Request already sent')
    }

    const connection = await prisma.connection.create({
      data: { fromUserId, toUserId, status: 'PENDING' },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            role: true,
            freelancerProfile: { select: { fullName: true, title: true, profileImage: true } },
            companyProfile: { select: { companyName: true, industry: true, profileImage: true } },
            clientProfile: { select: { fullName: true, profileImage: true } },
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
            role: true,
            freelancerProfile: { select: { fullName: true, title: true, profileImage: true } },
            companyProfile: { select: { companyName: true, industry: true, profileImage: true } },
            clientProfile: { select: { fullName: true, profileImage: true } },
          },
        },
      },
    })

    const senderName =
      connection.fromUser.freelancerProfile?.fullName ||
      connection.fromUser.companyProfile?.companyName ||
      connection.fromUser.clientProfile?.fullName ||
      'Someone'

    await notificationService.createNotification({
      userId: toUserId,
      type: 'CONNECTION_REQUEST',
      entityId: connection.id,
      title: 'New connection request',
      message: `${senderName} wants to connect with you.`,
      metadata: {
        connectionId: connection.id,
        fromUserId,
        toUserId,
      },
      link: '/network',
    })

    return connection
  }

  // Accept connection request
  async acceptRequest(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } })
    if (!connection) throw new Error('Request not found')
    if (connection.toUserId !== userId) throw new Error('Not authorized')
    if (connection.status !== 'PENDING') throw new Error('Request already handled')

    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' },
    })

    const conversation = await getOrCreateConversation(
      updatedConnection.fromUserId,
      updatedConnection.toUserId
    )

    await notificationService.createNotification({
      userId: updatedConnection.fromUserId,
      type: 'CONNECTION_ACCEPTED',
      entityId: updatedConnection.id,
      title: 'Connection request accepted',
      message: 'Your connection request was accepted.',
      metadata: {
        connectionId: updatedConnection.id,
        conversationId: conversation.id,
      },
      link: `/messages?conversationId=${conversation.id}`,
    })

    return {
      ...updatedConnection,
      conversationId: conversation.id,
    }
  }

  // Reject / ignore connection request
  async rejectRequest(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } })
    if (!connection) throw new Error('Request not found')
    if (connection.toUserId !== userId) throw new Error('Not authorized')

    return prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'REJECTED' },
    })
  }

  // Remove connection
  async removeConnection(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } })
    if (!connection) throw new Error('Connection not found')
    if (connection.fromUserId !== userId && connection.toUserId !== userId) {
      throw new Error('Not authorized')
    }
    return prisma.connection.delete({ where: { id: connectionId } })
  }

  // Get pending requests (incoming)
  async getPendingRequests(userId: string) {
    return prisma.connection.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            role: true,
            freelancerProfile: { select: { fullName: true, title: true, profileImage: true, country: true } },
            companyProfile: { select: { companyName: true, industry: true, profileImage: true, country: true } },
            clientProfile: { select: { fullName: true, profileImage: true, country: true } },
          },
        },
      },
    })
  }

  // Get all connections
  async getConnections(userId: string, search?: string) {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { fromUserId: userId, status: 'ACCEPTED' },
          { toUserId: userId, status: 'ACCEPTED' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            role: true,
            freelancerProfile: { select: { fullName: true, title: true, profileImage: true, country: true } },
            companyProfile: { select: { companyName: true, industry: true, profileImage: true, country: true } },
            clientProfile: { select: { fullName: true, profileImage: true, country: true } },
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
            role: true,
            freelancerProfile: { select: { fullName: true, title: true, profileImage: true, country: true } },
            companyProfile: { select: { companyName: true, industry: true, profileImage: true, country: true } },
            clientProfile: { select: { fullName: true, profileImage: true, country: true } },
          },
        },
      },
    })

    // Return the other user in each connection
    const mapped = connections.map(c => ({
      connectionId: c.id,
      connectedAt: c.updatedAt,
      user: c.fromUserId === userId ? c.toUser : c.fromUser,
    }))

    if (search) {
      const s = search.toLowerCase()
      return mapped.filter(c => {
        const u = c.user as any
        const name = u?.freelancerProfile?.fullName ||
          u?.companyProfile?.companyName ||
          u?.clientProfile?.fullName || ''
        return name.toLowerCase().includes(s)
      })
    }

    return mapped
  }

  // Get people you may know
  async getSuggestions(userId: string) {
    // Get existing connections to exclude
    const existing = await prisma.connection.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      select: { fromUserId: true, toUserId: true },
    })

    const excludeIds = new Set<string>([userId])
    existing.forEach(c => {
      excludeIds.add(c.fromUserId)
      excludeIds.add(c.toUserId)
    })

    const baseWhere = {
      id: { notIn: Array.from(excludeIds) },
      isOnboarded: true,
    }

    const selectFields = {
      id: true,
      email: true,
      role: true,
      freelancerProfile: {
        select: { fullName: true, title: true, profileImage: true, country: true, skills: true },
      },
      companyProfile: {
        select: { companyName: true, industry: true, profileImage: true, country: true },
      },
      clientProfile: {
        select: { fullName: true, profileImage: true, country: true },
      },
    }

    // Fetch companies and people separately so each section always gets results
    // Remove isOnboarded requirement for companies — show any company with a profile
    const companyWhere = {
      id: { notIn: Array.from(excludeIds) },
      role: 'COMPANY' as const,
      companyProfile: { isNot: null },
    }
    const peopleWhere = {
      id: { notIn: Array.from(excludeIds) },
      isOnboarded: true,
      NOT: { role: 'COMPANY' as const },
    }

    const [companies, people] = await Promise.all([
      prisma.user.findMany({
        where: companyWhere,
        take: 9,
        orderBy: { createdAt: 'desc' },
        select: selectFields,
      }).catch(() => [] as any[]),
      prisma.user.findMany({
        where: peopleWhere,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: selectFields,
      }).catch(() => [] as any[]),
    ])

    return [...companies, ...people]
  }

  // Get connection status between two users
  async getStatus(userId: string, otherUserId: string) {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId },
        ],
      },
    })
    return connection || null
  }
}

export const connectionService = new ConnectionService()
