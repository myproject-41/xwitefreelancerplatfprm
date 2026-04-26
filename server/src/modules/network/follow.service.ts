import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'

export class FollowService {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error('Cannot follow yourself')

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    if (existing) return existing

    const follow = await prisma.follow.create({
      data: { followerId, followingId },
    })

    // Notify the followed user
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: {
        freelancerProfile: { select: { fullName: true } },
        companyProfile:    { select: { companyName: true } },
        clientProfile:     { select: { fullName: true } },
        email: true,
      },
    })
    const followerName =
      follower?.freelancerProfile?.fullName ||
      follower?.companyProfile?.companyName ||
      follower?.clientProfile?.fullName ||
      follower?.email ||
      'Someone'

    await notificationService.createNotification({
      userId:   followingId,
      type:     'NEW_FOLLOW',
      entityId: followerId,
      title:    'New Follower',
      message:  `${followerName} started following you.`,
      link:     `/network?section=following`,
    }).catch(() => { /* non-critical */ })

    return follow
  }

  async unfollow(followerId: string, followingId: string) {
    return prisma.follow.deleteMany({
      where: { followerId, followingId },
    })
  }

  async getFollowing(userId: string) {
    return prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
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
  }

  async getFollowers(userId: string) {
    return prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
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
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    return !!follow
  }
}

export const followService = new FollowService()
