import { prisma } from '../../config/db'
import { env } from '../../config/env'
import { notificationService } from '../notification/notification.service'

// ── OpenAI via native fetch (no extra package needed) ────────────────────────

async function callOpenAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 600
): Promise<string> {
  const key = env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as any
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── Service ───────────────────────────────────────────────────────────────────

export class AgentService {
  // ── Signup welcome notification ──────────────────────────────────────────────
  async sendWelcomeNotification(userId: string, role: string) {
    const isFreelancer = role === 'FREELANCER'
    await notificationService.createNotification({
      userId,
      type: 'AGENT_MATCH',
      entityId: userId,
      title: "👋 Hey! I'm your AI Agent",
      message: isFreelancer
        ? 'I can find tasks that match your skills. Visit the AI Agent page to get started!'
        : 'I can help you find the perfect freelancer for your work. Visit the AI Agent page anytime!',
      link: '/agent',
      metadata: { agentWelcome: true, agentType: isFreelancer ? 'find_job' : 'hire' },
    })
  }

  // ── Notify poster when they create a TASK post ───────────────────────────────
  async handleNewPost(post: {
    id: string; type: string; title: string; clientId: string; skills: string[]
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

  // ── Generate proposal draft for freelancer (OpenAI) ──────────────────────────
  async generateProposalDraft(postId: string, userId: string) {
    const [post, profile] = await Promise.all([
      prisma.post.findUnique({
        where: { id: postId },
        select: { title: true, description: true, skills: true, budget: true },
      }),
      prisma.freelancerProfile.findUnique({
        where: { userId },
        select: { fullName: true, title: true, skills: true, hourlyRate: true, experienceLevel: true, bio: true },
      }),
    ])

    if (!post) throw new Error('Post not found')

    const skillList = profile?.skills?.join(', ') || 'various skills'
    const freelancerTitle = profile?.title || 'Freelancer'
    const experienceNote = profile?.experienceLevel ? ` (${profile.experienceLevel} level)` : ''
    const budgetNote = post.budget ? ` Budget: ₹${post.budget}.` : ''

    const coverLetter = await callOpenAI([
      {
        role: 'system',
        content:
          'You are an expert freelance proposal writer. Write professional, concise, and persuasive cover letters. Focus on the freelancer\'s relevant skills and how they match the task. Keep it under 250 words. Do NOT use generic phrases like "I hope this message finds you well". Be specific and confident.',
      },
      {
        role: 'user',
        content: `Write a cover letter for this job proposal.

Task: "${post.title}"
Task description: ${post.description}
Required skills: ${post.skills.join(', ')}${budgetNote}

Freelancer profile:
- Role: ${freelancerTitle}${experienceNote}
- Skills: ${skillList}
${profile?.bio ? `- Bio: ${profile.bio}` : ''}

Write only the cover letter text, no headers or signatures.`,
      },
    ])

    // Estimate a sensible rate
    const proposedRate = post.budget
      ? Math.round(post.budget * 0.9)
      : profile?.hourlyRate
      ? profile.hourlyRate * 10
      : undefined

    // Estimate timeline based on description length / complexity
    const estimatedDays = post.budget && post.budget > 10000 ? 14 : 7

    return { coverLetter, proposedRate, estimatedDays }
  }

  // ── Generate personalized invite for a freelancer (OpenAI) + notify them ─────
  async generateInviteAndNotify(postId: string, freelancerId: string, clientId: string) {
    const [post, freelancer, clientUser] = await Promise.all([
      prisma.post.findUnique({
        where: { id: postId },
        select: { title: true, description: true, skills: true, budget: true },
      }),
      prisma.freelancerProfile.findUnique({
        where: { userId: freelancerId },
        select: { fullName: true, title: true, skills: true, experienceLevel: true },
      }),
      prisma.user.findUnique({
        where: { id: clientId },
        select: {
          clientProfile: { select: { fullName: true } },
          companyProfile: { select: { companyName: true } },
        },
      }),
    ])

    if (!post) throw new Error('Post not found')

    const clientName =
      clientUser?.clientProfile?.fullName ??
      clientUser?.companyProfile?.companyName ??
      'A client'
    const freelancerName = freelancer?.fullName ?? 'there'
    const matchedSkills = (freelancer?.skills ?? []).filter((s) => post.skills.includes(s))

    const invitation = await callOpenAI([
      {
        role: 'system',
        content:
          'You are an AI recruitment assistant. Write a short, friendly, and professional invitation message from a client to a freelancer for a specific task. Keep it under 120 words. Be direct and mention the specific skills that match.',
      },
      {
        role: 'user',
        content: `Write an invitation from "${clientName}" to freelancer "${freelancerName}" for this task.

Task: "${post.title}"
Task description: ${post.description.slice(0, 300)}
Required skills: ${post.skills.join(', ')}
Freelancer matched skills: ${matchedSkills.join(', ') || 'general skills'}
${post.budget ? `Budget: ₹${post.budget}` : ''}

Write only the invitation message text, no subject lines.`,
      },
    ])

    // Send notification to freelancer
    await notificationService.createNotification({
      userId: freelancerId,
      type: 'AGENT_MATCH',
      entityId: postId,
      title: `🤖 ${clientName} wants you for a task!`,
      message: invitation,
      link: `/posts/${postId}`,
      metadata: { clientId, postId, postTitle: post.title, agentInvite: true },
    })

    return { invitation, freelancerName, postTitle: post.title }
  }

  // ── Direct notify (no AI) ─────────────────────────────────────────────────────
  async notifyFreelancerDirect(postId: string, freelancerId: string, clientId: string) {
    const [post, clientUser] = await Promise.all([
      prisma.post.findUnique({
        where: { id: postId },
        select: { title: true },
      }),
      prisma.user.findUnique({
        where: { id: clientId },
        select: {
          clientProfile: { select: { fullName: true } },
          companyProfile: { select: { companyName: true } },
        },
      }),
    ])

    if (!post) throw new Error('Post not found')

    const clientName =
      clientUser?.clientProfile?.fullName ??
      clientUser?.companyProfile?.companyName ??
      'A client'

    await notificationService.createNotification({
      userId: freelancerId,
      type: 'AGENT_MATCH',
      entityId: postId,
      title: `🔔 ${clientName} wants to make this task`,
      message: `Hey! ${clientName} wants you to complete: "${post.title}". Are you interested? View the task to apply.`,
      link: `/posts/${postId}`,
      metadata: { clientId, postId, postTitle: post.title },
    })
  }

  // ── Find tasks for freelancer (skill match) ──────────────────────────────────
  async findTasksForFreelancer(userId: string) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId },
      select: { skills: true },
    })
    const skills = profile?.skills ?? []
    const where: any = { type: 'TASK', status: 'OPEN', clientId: { not: userId } }
    if (skills.length) where.skills = { hasSome: skills }

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
            name: p.client.clientProfile?.fullName ?? p.client.companyProfile?.companyName ?? 'Client',
            image: p.client.clientProfile?.profileImage ?? p.client.companyProfile?.profileImage ?? null,
          },
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
  }

  // ── Find freelancers for a post (3 tiers) ────────────────────────────────────
  async findFreelancersForPost(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, skills: true, budget: true },
    })
    if (!post) throw new Error('Post not found')

    const where: any = {}
    if (post.skills.length) where.skills = { hasSome: post.skills }

    const profiles = await prisma.freelancerProfile.findMany({
      where,
      select: {
        userId: true, fullName: true, title: true, profileImage: true,
        skills: true, hourlyRate: true, fixedPrice: true, experienceLevel: true,
        avgRating: true, totalReviews: true, country: true, availability: true,
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
      expert: [], intermediate: [], beginner: [],
    }

    for (const f of profiles) {
      const tier = categorize(f.experienceLevel)
      const matchedSkills = post.skills.filter((s) => f.skills.includes(s))
      tiers[tier].push({ ...f, matchedSkills, matchScore: matchedSkills.length })
    }

    for (const key of ['expert', 'intermediate', 'beginner'] as const) {
      tiers[key].sort((a, b) => b.matchScore - a.matchScore || (b.avgRating ?? 0) - (a.avgRating ?? 0))
      tiers[key] = tiers[key].slice(0, 5)
    }

    return { post, tiers }
  }

  // ── Get client's recent posts ────────────────────────────────────────────────
  async getRecentPosts(userId: string) {
    return prisma.post.findMany({
      where: { clientId: userId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true, title: true, type: true, description: true,
        skills: true, budget: true, status: true, createdAt: true,
        _count: { select: { proposals: true } },
      },
    })
  }
}

export const agentService = new AgentService()
