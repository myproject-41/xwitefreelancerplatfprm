import { prisma } from '../../config/db'
import { getOrCreateConversation } from '../chat/conversation.service'
import { notificationService } from '../notification/notification.service'
import { escrowService } from '../escrow/escrow.service'

interface CreateProposalInput {
  postId: string
  freelancerId: string
  coverLetter: string
  proposedRate?: number
}

export class ProposalService {
  async createProposal(input: CreateProposalInput) {
    // Check post exists
    const post = await prisma.post.findUnique({ where: { id: input.postId } })
    if (!post) throw new Error('Post not found')
    if (post.status !== 'OPEN') throw new Error('Post is no longer accepting proposals')

    // Check not already proposed
    const existing = await prisma.proposal.findFirst({
      where: { postId: input.postId, freelancerId: input.freelancerId },
    })
    if (existing) throw new Error('You already sent a proposal for this post')

    const proposal = await prisma.proposal.create({
      data: {
        postId: input.postId,
        freelancerId: input.freelancerId,
        coverLetter: input.coverLetter,
        proposedRate: input.proposedRate,
      },
      include: {
        freelancer: {
          select: {
            id: true,
            role: true,
            freelancerProfile: {
              select: {
                fullName: true,
                title: true,
                profileImage: true,
                avgRating: true,
                hourlyRate: true,
              },
            },
            companyProfile: {
              select: {
                companyName: true,
              },
            },
            clientProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            clientId: true,
            client: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    })

    const senderName =
      proposal.freelancer.freelancerProfile?.fullName ||
      proposal.freelancer.companyProfile?.companyName ||
      proposal.freelancer.clientProfile?.fullName ||
      'Someone'

    await notificationService.createNotification({
      userId: proposal.post.clientId,
      type: 'NEW_PROPOSAL',
      entityId: proposal.id,
      title: 'New proposal received',
      message: `${senderName} sent a proposal for "${proposal.post.title}".`,
      metadata: {
        proposalId: proposal.id,
        postId: input.postId,
        postTitle: proposal.post.title,
        coverLetter: input.coverLetter,
        proposedRate: input.proposedRate ?? null,
        freelancerId: input.freelancerId,
        freelancerName: senderName,
        freelancerTitle: proposal.freelancer.freelancerProfile?.title ?? null,
        freelancerImage: proposal.freelancer.freelancerProfile?.profileImage ?? null,
      },
      link: `/alerts`,
    })

    return proposal
  }

  async getMyProposals(freelancerId: string) {
    return prisma.proposal.findMany({
      where: { freelancerId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            budget: true,
            type: true,
            status: true,
            client: {
              select: {
                id: true,
                companyProfile: { select: { companyName: true, profileImage: true } },
                clientProfile:  { select: { fullName: true, profileImage: true } },
              },
            },
            // include task so freelancer can find their escrow after acceptance
            tasks: {
              where: { freelancerId },
              select: {
                id: true,
                escrow: { select: { id: true, status: true } },
              },
              take: 1,
            },
          },
        },
      },
    })
  }

  /* proposals received by a client/company across ALL their posts */
  async getReceivedProposals(clientId: string) {
    return prisma.proposal.findMany({
      where: { post: { clientId } },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            budget: true,
            status: true,
            // include tasks so we can resolve escrow for accepted proposals
            tasks: {
              select: {
                id: true,
                freelancerId: true,
                escrow: { select: { id: true, status: true } },
              },
            },
          },
        },
        freelancer: {
          select: {
            id: true,
            role: true,
            freelancerProfile: {
              select: {
                fullName: true,
                profileImage: true,
                title: true,
                avgRating: true,
                totalReviews: true,
                hourlyRate: true,
                skills: true,
                country: true,
                city: true,
              },
            },
            companyProfile: {
              select: { companyName: true, profileImage: true },
            },
            clientProfile: {
              select: { fullName: true, profileImage: true },
            },
          },
        },
      },
    })
  }

  async acceptProposal(proposalId: string, clientId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { post: true },
    })
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.post.clientId !== clientId) throw new Error('Not authorized')
    if (proposal.status !== 'PENDING') throw new Error('This proposal has already been acted on')

    // Accept this proposal + reject others
    await prisma.proposal.updateMany({
      where: { postId: proposal.postId, id: { not: proposalId } },
      data: { status: 'REJECTED' },
    })

    const acceptedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'ACCEPTED' },
    })

    // Create Task linked to the post
    const amount = proposal.proposedRate ?? proposal.post.budget ?? 0
    const task = await prisma.task.create({
      data: {
        title:        proposal.post.title,
        description:  proposal.post.description,
        budget:       amount,
        deadline:     proposal.post.deadline ?? undefined,
        skills:       proposal.post.skills,
        clientId,
        freelancerId: proposal.freelancerId,
        postId:       proposal.postId,
        status:       'OPEN',
      },
    })

    // Create Escrow for the task (unfunded — client must fund from wallet)
    const escrow = await escrowService.createEscrow(
      task.id,
      clientId,
      proposal.freelancerId,
      amount,
    )

    // Update post status to IN_PROGRESS
    await prisma.post.update({
      where: { id: proposal.postId },
      data: { status: 'IN_PROGRESS' },
    })

    const conversation = await getOrCreateConversation(proposal.freelancerId, clientId)

    await notificationService.createNotification({
      userId: proposal.freelancerId,
      type: 'PROPOSAL_ACCEPTED',
      entityId: proposal.id,
      title: '🎉 Your proposal was accepted!',
      message: `"${proposal.post.title}" — waiting for the client to fund the escrow. You'll be notified to begin work once funded.`,
      metadata: {
        proposalId: proposal.id,
        postId:     proposal.postId,
        taskId:     task.id,
        escrowId:   escrow.id,
        conversationId: conversation.id,
      },
      link: `/payment/escrow/${escrow.id}`,
    })

    return {
      ...acceptedProposal,
      taskId:        task.id,
      escrowId:      escrow.id,
      conversationId: conversation.id,
    }
  }

  async rejectProposal(proposalId: string, clientId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { post: true },
    })
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.post.clientId !== clientId) throw new Error('Not authorized')
    if (proposal.status !== 'PENDING') throw new Error('This proposal has already been acted on')

    const rejectedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
    })

    await notificationService.createNotification({
      userId: proposal.freelancerId,
      type: 'PROPOSAL_REJECTED',
      entityId: proposal.id,
      title: 'Proposal declined',
      message: `Your proposal for "${proposal.post.title}" was not selected this time. Keep applying!`,
      metadata: {
        proposalId: proposal.id,
        postId: proposal.postId,
        postTitle: proposal.post.title,
      },
      link: `/my-proposals`,
    })

    return rejectedProposal
  }

  async getProposal(proposalId: string, userId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        post: { select: { id: true, title: true, clientId: true, budget: true } },
        freelancer: {
          select: {
            id: true,
            freelancerProfile: {
              select: { fullName: true, title: true, profileImage: true, avgRating: true },
            },
            companyProfile: { select: { companyName: true, profileImage: true } },
            clientProfile:  { select: { fullName: true, profileImage: true } },
          },
        },
      },
    })
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.freelancerId !== userId && proposal.post.clientId !== userId) {
      throw new Error('Not authorized')
    }
    return proposal
  }

  async withdrawProposal(proposalId: string, freelancerId: string) {
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } })
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.freelancerId !== freelancerId) throw new Error('Not authorized')

    return prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'WITHDRAWN' },
    })
  }
}

export const proposalService = new ProposalService()
