import { prisma } from '../../config/db'

export class UserService {
  private async getClientSpendStats(userId: string) {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)

    const monthAgo = new Date(now)
    monthAgo.setDate(now.getDate() - 30)

    const [total, weekly, monthly] = await Promise.all([
      prisma.escrow.aggregate({
        where: {
          clientId: userId,
          status: 'RELEASED',
        },
        _sum: { amount: true },
      }),
      prisma.escrow.aggregate({
        where: {
          clientId: userId,
          status: 'RELEASED',
          releasedAt: { gte: weekAgo },
        },
        _sum: { amount: true },
      }),
      prisma.escrow.aggregate({
        where: {
          clientId: userId,
          status: 'RELEASED',
          releasedAt: { gte: monthAgo },
        },
        _sum: { amount: true },
      }),
    ])

    return {
      totalSpent: total._sum.amount ?? 0,
      weeklySpent: weekly._sum.amount ?? 0,
      monthlySpent: monthly._sum.amount ?? 0,
    }
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isOnboarded: true,
        createdAt: true,
        freelancerProfile: true,
        companyProfile: true,
        clientProfile: true,
      },
    })
    if (!user) throw new Error('User not found')

    if (user.role === 'CLIENT' && user.clientProfile) {
      const spendStats = await this.getClientSpendStats(id)
      return {
        ...user,
        clientProfile: {
          ...user.clientProfile,
          ...spendStats,
        },
      }
    }

    return user
  }

  async getPublicProfileById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        freelancerProfile: {
          select: {
            fullName: true,
            title: true,
            bio: true,
            coverImage: true,
            profileImage: true,
            skills: true,
            country: true,
            city: true,
            timezone: true,
            hourlyRate: true,
            minBudget: true,
            currency: true,
            fixedPrice: true,
            experienceLevel: true,
            noticePeriod: true,
            availability: true,
            languages: true,
            portfolioUrls: true,
            experience: true,
            qualifications: true,
            avgRating: true,
            totalReviews: true,
          },
        },
        companyProfile: {
          select: {
            companyName: true,
            description: true,
            industry: true,
            coverImage: true,
            profileImage: true,
            website: true,
            employeeCount: true,
            country: true,
            city: true,
            workType: true,
            hiringSkills: true,
            avgRating: true,
            totalReviews: true,
          },
        },
        clientProfile: {
          select: {
            fullName: true,
            companyName: true,
            description: true,
            coverImage: true,
            profileImage: true,
            country: true,
            city: true,
            taskCategories: true,
            workPreference: true,
          },
        },
      },
    })

    if (!user) throw new Error('User not found')

    const connectionsCount = await prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ fromUserId: id }, { toUserId: id }],
      },
    })

    if (user.role === 'FREELANCER' && user.freelancerProfile) {
      const fp = user.freelancerProfile
      return {
        id: user.id,
        role: user.role,
        fullName: fp.fullName,
        title: fp.title,
        bio: fp.bio,
        coverImage: fp.coverImage,
        profileImage: fp.profileImage,
        skills: fp.skills,
        country: fp.country,
        city: fp.city,
        timezone: fp.timezone,
        hourlyRate: fp.hourlyRate,
        minBudget: fp.minBudget,
        currency: fp.currency,
        fixedPrice: fp.fixedPrice,
        experienceLevel: fp.experienceLevel,
        noticePeriod: fp.noticePeriod,
        availability: fp.availability,
        languages: fp.languages,
        portfolioUrls: fp.portfolioUrls,
        experience: fp.experience,
        qualifications: fp.qualifications,
        avgRating: fp.avgRating,
        totalReviews: fp.totalReviews,
        connectionsCount,
      }
    }

    if (user.role === 'COMPANY' && user.companyProfile) {
      return {
        id: user.id,
        role: user.role,
        fullName: user.companyProfile.companyName,
        companyName: user.companyProfile.companyName,
        bio: user.companyProfile.description,
        coverImage: user.companyProfile.coverImage,
        profileImage: user.companyProfile.profileImage,
        skills: user.companyProfile.hiringSkills,
        industry: user.companyProfile.industry,
        website: user.companyProfile.website,
        employeeCount: user.companyProfile.employeeCount,
        country: user.companyProfile.country,
        city: user.companyProfile.city,
        workType: user.companyProfile.workType,
        avgRating: user.companyProfile.avgRating,
        totalReviews: user.companyProfile.totalReviews,
        connectionsCount,
      }
    }

    if (user.role === 'CLIENT' && user.clientProfile) {
      const spendStats = await this.getClientSpendStats(id)
      return {
        id: user.id,
        role: user.role,
        fullName: user.clientProfile.fullName ?? user.clientProfile.companyName,
        companyName: user.clientProfile.companyName,
        bio: user.clientProfile.description,
        coverImage: user.clientProfile.coverImage,
        profileImage: user.clientProfile.profileImage,
        skills: user.clientProfile.taskCategories,
        country: user.clientProfile.country,
        city: user.clientProfile.city,
        workPreference: user.clientProfile.workPreference,
        ...spendStats,
        connectionsCount,
      }
    }

    throw new Error('Profile not found')
  }

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isOnboarded: true,
        createdAt: true,
      },
    })
  }

  async markOnboarded(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    })
  }

  async deleteUser(userId: string) {
    return prisma.user.delete({ where: { id: userId } })
  }
}

export const userService = new UserService()
