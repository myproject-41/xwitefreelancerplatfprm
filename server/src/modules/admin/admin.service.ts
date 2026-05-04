import { prisma } from '../../config/db'
import { notificationService } from '../notification/notification.service'

export class AdminService {
  /* ── List all companies with pending GST verification ── */
  async getPendingGstCompanies() {
    return prisma.companyProfile.findMany({
      where: { gstNumber: { not: null }, gstVerified: false },
      include: { user: { select: { id: true, email: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  /* ── Admin approves a company's GST → auto blue tick ── */
  async approveGst(companyUserId: string) {
    const profile = await prisma.companyProfile.findUnique({ where: { userId: companyUserId } })
    if (!profile) throw new Error('Company profile not found')
    if (!profile.gstNumber) throw new Error('No GST number submitted')

    await prisma.companyProfile.update({
      where: { userId: companyUserId },
      data: { gstVerified: true },
    })
    await prisma.user.update({ where: { id: companyUserId }, data: { isVerified: true } })

    await notificationService.createNotification({
      userId:   companyUserId,
      type:     'REVIEW_RECEIVED',
      entityId: companyUserId,
      title:    '✅ Your company is now verified!',
      message:  'Your GST certificate was approved. A blue tick badge now appears on your profile and posts.',
      link:     '/profile/company',
    })

    return { success: true }
  }

  /* ── Admin revokes verification ── */
  async revokeVerification(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { isVerified: false } })
    await prisma.companyProfile.updateMany({ where: { userId }, data: { gstVerified: false } })
    return { success: true }
  }

  /* ── Dashboard summary ── */
  async getDashboardStats() {
    const [users, posts, escrows, pendingGst] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.escrow.count({ where: { status: 'RELEASED' } }),
      prisma.companyProfile.count({ where: { gstNumber: { not: null }, gstVerified: false } }),
    ])
    return { users, posts, completedEscrows: escrows, pendingGst }
  }
}

export const adminService = new AdminService()
