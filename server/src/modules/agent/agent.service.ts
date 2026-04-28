import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'
import { connectionService } from '../network/connection.service'

export class AgentService {
  async sendWelcomeNotification(userId: string, role: string) {
    const isFreelancer = role === 'FREELANCER'
    const message = isFreelancer
      ? 'I can find tasks that match your skills. Visit the AI Agent page to get started!'
      : 'I can help you find the perfect freelancer for your work. Visit the AI Agent page anytime!'

    await notificationService.createNotification({
      userId,
      type: 'AGENT_MATCH',
      entityId: userId,
      title: "👋 Hey! I'm your AI Agent",
      message,
      link: '/agent',
      metadata: { agentWelcome: true, agentType: isFreelancer ? 'find_job' : 'hire' },
    })
  }

  async handleNewPost(post: {
    id: string
    type: string
    title: string
    clientId: string
    skills: string[]
  }) {
    if (post.type !== 'TASK') return

    await notificationService.createNotification({
      userId: post.clientId,
      type: 'AGENT_MATCH',
      entityId: post.id,
      title: '🤖 AI Agent can help!',
      message: 'I can search for expert freelancers who match your task requirements.',
      link: '/agent',
      metadata: { postId: post.id, agentType: 'hire' },
    })
  }

  async findTasksForFreelancer(userId: string) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId },
      select: { skills: true },
    })

    const skills = profile?.skills ?? []

    const where: any = {
      type: 'TASK',
      status: 'OPEN',
      clientId: { not: userId },
    }
    if (skills.length) {
      where.skills = { hasSome: skills }
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            role: true,
            clientProfile: { select: { fullName: true, profileImage: true } },
            companyProfile: { select: { companyName: true, profileImage: true } },
          },
        },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    return posts
      .map((p) => {
        const matchScore = skills.filter((s) => p.skills.includes(s)).length
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          budget: p.budget,
          skills: p.skills,
          deadline: p.deadline,
          proposalCount: p._count.proposals,
          matchScore,
          client: {
            id: p.client.id,
            name:
              p.client.clientProfile?.fullName ??
              p.client.companyProfile?.companyName ??
              'Client',
            image:
              p.client.clientProfile?.profileImage ??
              p.client.companyProfile?.profileImage ??
              null,
          },
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
  }

  async findFreelancersForPost(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, skills: true, budget: true },
    })
    if (!post) throw new Error('Post not found')

    const where: any = {}
    if (post.skills.length) {
      where.skills = { hasSome: post.skills }
    }

    const profiles = await prisma.freelancerProfile.findMany({
      where,
      select: {
        userId: true,
        fullName: true,
        title: true,
        profileImage: true,
        skills: true,
        hourlyRate: true,
        fixedPrice: true,
        experienceLevel: true,
        avgRating: true,
        totalReviews: true,
        country: true,
        availability: true,
      },
      take: 30,
    })

    const categorize = (level?: string | null): 'expert' | 'intermediate' | 'beginner' => {
      if (!level) return 'intermediate'
      const l = level.toUpperCase()
      if (l.includes('SENIOR') || l.includes('EXPERT') || l.includes('LEAD')) return 'expert'
      if (l.includes('JUNIOR') || l.includes('ENTRY') || l.includes('BEGINNER') || l.includes('BASIC')) return 'beginner'
      return 'intermediate'
    }

    const tiers: Record<'expert' | 'intermediate' | 'beginner', any[]> = {
      expert: [],
      intermediate: [],
      beginner: [],
    }

    for (const f of profiles) {
      const tier = categorize(f.experienceLevel)
      const matchedSkills = post.skills.filter((s) => f.skills.includes(s))
      tiers[tier].push({
        userId: f.userId,
        fullName: f.fullName,
        title: f.title,
        profileImage: f.profileImage,
        skills: f.skills,
        matchedSkills,
        hourlyRate: f.hourlyRate,
        fixedPrice: f.fixedPrice,
        experienceLevel: f.experienceLevel,
        avgRating: f.avgRating,
        totalReviews: f.totalReviews,
        country: f.country,
        availability: f.availability,
        matchScore: matchedSkills.length,
      })
    }

    for (const key of ['expert', 'intermediate', 'beginner'] as const) {
      tiers[key].sort(
        (a, b) =>
          b.matchScore - a.matchScore || (b.avgRating ?? 0) - (a.avgRating ?? 0)
      )
      tiers[key] = tiers[key].slice(0, 5)
    }

    return { post, tiers }
  }

  async getRecentPosts(userId: string) {
    return prisma.post.findMany({
      where: {
        clientId: userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        skills: true,
        budget: true,
        status: true,
        createdAt: true,
        _count: { select: { proposals: true } },
      },
    })
  }

  async agentSendRequest(fromUserId: string, toUserId: string, taskTitle: string) {
    await connectionService.sendRequest(fromUserId, toUserId)

    await notificationService.createNotification({
      userId: toUserId,
      type: 'CONNECTION_REQUEST',
      entityId: fromUserId,
      title: '🤖 New connection request via AI Agent',
      message: `Someone wants you to complete a task: "${taskTitle}". View your connections to respond.`,
      link: '/network',
      metadata: { fromUserId, agentInitiated: true, taskTitle },
    })
  }
}

export const agentService = new AgentService()
