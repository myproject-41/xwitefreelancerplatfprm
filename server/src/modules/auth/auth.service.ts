import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/db'
import { env } from '../../config/env'
import { Role } from './roles'

interface RegisterInput {
  email: string
  password: string
  role: Role
}

interface LoginInput {
  email: string
  password: string
}

interface JwtPayload {
  userId: string
  email: string
  role: Role
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export class AuthService {
  // ── Register ─────────────────────────────
  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email)
    const { password, role } = input

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { existingAccount: true as const }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user + wallet in one transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, password: hashedPassword, role },
        select: {
          id: true,
          email: true,
          role: true,
          isOnboarded: true,
          createdAt: true,
        },
      })
      await tx.wallet.create({ data: { userId: newUser.id } })
      return newUser
    })

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    })

    return {
      existingAccount: false as const,
      user,
      token,
    }
  }

  // ── Login ─────────────────────────────────
  async login(input: LoginInput) {
    const email = normalizeEmail(input.email)
    const { password } = input

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isOnboarded: true,
        isActive: true,
        freelancerProfile: {
          select: {
            fullName: true,
            title: true,
            coverImage: true,
            profileImage: true,
            skills: true,
            hourlyRate: true,
            currency: true,
            country: true,
            city: true,
            availability: true,
            avgRating: true,
          },
        },
        companyProfile: {
          select: {
            companyName: true,
            industry: true,
            coverImage: true,
            profileImage: true,
            country: true,
            city: true,
            employeeCount: true,
            avgRating: true,
          },
        },
        clientProfile: {
          select: {
            fullName: true,
            coverImage: true,
            profileImage: true,
            country: true,
            city: true,
          },
        },
      },
    })

    if (!user) throw new Error('Invalid email or password')
    if (!user.isActive) throw new Error('Account is deactivated. Contact support.')

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new Error('Invalid email or password')

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    })

    const { password: _, ...userWithoutPassword } = user
    return { user: userWithoutPassword, token }
  }

  // ── Get Me (full profile) ─────────────────
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isOnboarded: true,
        emailVerified: true,
        createdAt: true,
        freelancerProfile: {
          select: {
            fullName: true,
            title: true,
            bio: true,
            coverImage: true,
            profileImage: true,
            skills: true,
            hourlyRate: true,
            currency: true,
            fixedPrice: true,
            minBudget: true,
            country: true,
            city: true,
            timezone: true,
            availability: true,
            noticePeriod: true,
            experienceLevel: true,
            avgRating: true,
            totalReviews: true,
            languages: true,
            portfolioUrls: true,
            experience: true,
            qualifications: true,
          },
        },
        companyProfile: {
          select: {
            companyName: true,
            industry: true,
            description: true,
            coverImage: true,
            profileImage: true,
            website: true,
            employeeCount: true,
            location: true,
            country: true,
            city: true,
            timezone: true,
            workType: true,
            hiringSkills: true,
            avgRating: true,
            totalReviews: true,
          },
        },
        clientProfile: {
          select: {
            fullName: true,
            coverImage: true,
            profileImage: true,
            description: true,
            companyName: true,
            country: true,
            city: true,
            timezone: true,
            taskCategories: true,
            workPreference: true,
          },
        },
      },
    })

    if (!user) throw new Error('User not found')

    if (user.role === 'CLIENT' && user.clientProfile) {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [totalAgg, weeklyAgg, monthlyAgg] = await Promise.all([
        prisma.escrow.aggregate({
          where: { clientId: userId, status: 'RELEASED' },
          _sum: { amount: true },
        }),
        prisma.escrow.aggregate({
          where: { clientId: userId, status: 'RELEASED', releasedAt: { gte: startOfWeek } },
          _sum: { amount: true },
        }),
        prisma.escrow.aggregate({
          where: { clientId: userId, status: 'RELEASED', releasedAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
      ])

      return {
        ...user,
        clientProfile: {
          ...user.clientProfile,
          totalSpent:   totalAgg._sum.amount   ?? 0,
          weeklySpent:  weeklyAgg._sum.amount  ?? 0,
          monthlySpent: monthlyAgg._sum.amount ?? 0,
        },
      }
    }

    return user
  }

  // ── Change password ───────────────────────
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) throw new Error('Current password is incorrect')

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })

    return { message: 'Password changed successfully' }
  }

  // ── Delete account ────────────────────────
  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new Error('Incorrect password')

    await prisma.user.delete({ where: { id: userId } })
    return { message: 'Account deleted successfully' }
  }

  // ── Token helpers ─────────────────────────
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions)
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  }
}

export const authService = new AuthService()
