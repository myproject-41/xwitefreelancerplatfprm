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

  // Get people you may know — all eligible users, relevant ones first
  async getSuggestions(userId: string) {
    // Fetch current user's profile for relevance matching
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        freelancerProfile: { select: { skills: true, country: true } },
        companyProfile:   { select: { industry: true, country: true } },
        clientProfile:    { select: { country: true } },
      },
    })

    // Collect all user IDs already connected/pending with current user
    const existing = await prisma.connection.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      select: { fromUserId: true, toUserId: true },
    })

    const excludeIds = new Set<string>([userId])
    existing.forEach(c => {
      excludeIds.add(c.fromUserId)
      excludeIds.add(c.toUserId)
    })
    const excludeArr = Array.from(excludeIds)

    const selectFields = {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
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

    // Fetch a bounded set of companies and people (capped for perf)
    const [companies, people] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { notIn: excludeArr },
          role: 'COMPANY',
          companyProfile: { isNot: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: selectFields,
      }).catch(() => [] as any[]),
      prisma.user.findMany({
        where: {
          id: { notIn: excludeArr },
          isOnboarded: true,
          NOT: { role: 'COMPANY' },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: selectFields,
      }).catch(() => [] as any[]),
    ])

    // Relevance sort for companies: same industry first, then same country, then rest
    const myIndustry = me?.companyProfile?.industry || ''
    const myCountry  = me?.companyProfile?.country || me?.freelancerProfile?.country || me?.clientProfile?.country || ''

    const sortedCompanies = companies.sort((a: any, b: any) => {
      const aScore = (a.companyProfile?.industry === myIndustry && myIndustry ? 2 : 0)
                   + (a.companyProfile?.country  === myCountry  && myCountry  ? 1 : 0)
      const bScore = (b.companyProfile?.industry === myIndustry && myIndustry ? 2 : 0)
                   + (b.companyProfile?.country  === myCountry  && myCountry  ? 1 : 0)
      return bScore - aScore
    })

    // Relevance sort for people: shared skills count first, then same role, then same country
    const mySkills: string[] = me?.freelancerProfile?.skills || []
    const myRole = me?.role || ''

    const sortedPeople = people.sort((a: any, b: any) => {
      const aSkills: string[] = a.freelancerProfile?.skills || []
      const bSkills: string[] = b.freelancerProfile?.skills || []
      const sharedA = mySkills.filter(s => aSkills.includes(s)).length
      const sharedB = mySkills.filter(s => bSkills.includes(s)).length
      if (sharedB !== sharedA) return sharedB - sharedA

      const aRoleBonus = a.role === myRole ? 1 : 0
      const bRoleBonus = b.role === myRole ? 1 : 0
      if (bRoleBonus !== aRoleBonus) return bRoleBonus - aRoleBonus

      const aCountryBonus = (a.freelancerProfile?.country || a.clientProfile?.country) === myCountry && myCountry ? 1 : 0
      const bCountryBonus = (b.freelancerProfile?.country || b.clientProfile?.country) === myCountry && myCountry ? 1 : 0
      return bCountryBonus - aCountryBonus
    })

    return [...sortedCompanies, ...sortedPeople]
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
