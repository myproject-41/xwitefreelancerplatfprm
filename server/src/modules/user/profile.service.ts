import { prisma } from '../../config/db'

export class ProfileService {
  async getProfile(userId: string, role: string) {
    if (role === 'FREELANCER') {
      return prisma.freelancerProfile.findUnique({ where: { userId } })
    }
    if (role === 'COMPANY') {
      return prisma.companyProfile.findUnique({ where: { userId } })
    }
    if (role === 'CLIENT') {
      return prisma.clientProfile.findUnique({ where: { userId } })
    }
    throw new Error('Invalid role')
  }

  async upsertFreelancerProfile(userId: string, data: {
    fullName?: string
    title?: string
    bio?: string
    country?: string
    city?: string
    timezone?: string
    skills?: string[]
    languages?: any
    hourlyRate?: number
    currency?: string
    fixedPrice?: boolean
    minBudget?: number | null
    availability?: boolean
    noticePeriod?: 'IMMEDIATELY' | 'ONE_WEEK' | 'TWO_WEEKS' | 'ONE_MONTH' | 'MORE_THAN_ONE_MONTH'
    experienceLevel?: string
    experience?: any
    qualifications?: any
    portfolioUrls?: any
    coverImage?: string
    profileImage?: string
  }) {
    // Build update payload — only include fields the caller actually sent.
    // This prevents partial PUTs (e.g. image upload) from wiping arrays.
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value
    }

    // For brand-new profiles, arrays must default to [] so Prisma is happy.
    const createData = {
      ...data,
      skills: data.skills ?? [],
      languages: data.languages ?? [],
      portfolioUrls: data.portfolioUrls ?? [],
      noticePeriod: data.noticePeriod ?? null,
    }

    const profile = await prisma.freelancerProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...createData },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    })

    return profile
  }

  async upsertCompanyProfile(userId: string, data: {
    companyName: string
    description?: string
    industry?: string
    website?: string
    employeeCount?: string
    location?: string
    country?: string
    city?: string
    timezone?: string
    workType?: string[]
    hiringSkills?: string[]
    coverImage?: string
    profileImage?: string
  }) {
    // Only include explicitly-sent fields in update to preserve untouched arrays.
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value
    }

    const createData = {
      ...data,
      workType: data.workType ?? [],
      hiringSkills: data.hiringSkills ?? [],
    }

    const profile = await prisma.companyProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...createData },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    })

    return profile
  }

  async upsertClientProfile(userId: string, data: {
    fullName?: string
    companyName?: string
    description?: string
    coverImage?: string
    profileImage?: string
    country?: string
    city?: string
    timezone?: string
    taskCategories?: string[]
    workPreference?: string
  }) {
    // Only include explicitly-sent fields in update to preserve untouched arrays.
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value
    }

    const createData = {
      ...data,
      taskCategories: data.taskCategories ?? [],
    }

    const profile = await prisma.clientProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...createData },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { isOnboarded: true },
    })

    return profile
  }
}

export const profileService = new ProfileService()
