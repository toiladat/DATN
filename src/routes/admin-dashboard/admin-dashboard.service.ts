import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'

export type ActivityType = 'PROJECT_LAUNCHED' | 'WITHDRAWAL_REQUEST' | 'MILESTONE_COMPLETED'

export interface ActivityItem {
  type: ActivityType
  createdAt: number // timestamp ms
  title?: string
}

export interface DashboardProjectStats {
  total: number
  pending: number
  fundraising: number
  executing: number
  success: number
  failed: number
}

export interface DashboardStatsType {
  platformRevenue: number
  activeUsers: number
  liveProjects: number
  totalUsers: number
  pendingProjects: number
  pendingWithdrawals: number
  pendingMilestones: number
  projectStats: DashboardProjectStats
  adminProfile?: { avatar: string | null }
  recentActivities: ActivityItem[]
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(adminId?: string): Promise<DashboardStatsType> {
    const [
      revenueAgg,
      activeUsers,
      liveProjects,
      totalUsers,
      totalProjectsPending,
      totalProjectsFundraising,
      totalProjectsExecuting,
      totalProjectsSuccess,
      totalProjectsFailed,
      pendingProjects,
      pendingWithdrawals,
      pendingMilestones,
      recentProjects,
      recentWithdrawals,
      recentMilestones,
      adminUser,
    ] = await Promise.all([
      // Platform Revenue = SUM of raisedAmount of ALL projects
      this.prisma.project.aggregate({
        _sum: { raisedAmount: true },
        where: {
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),

      // Active Users = COUNT users NOT BLOCKED
      this.prisma.user.count({
        where: {
          status: { not: 'BLOCKED' },
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),

      // Live Projects = COUNT ALL projects (any status, not deleted)
      this.prisma.project.count({
        where: {
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),

      // Total Users = COUNT ALL users
      this.prisma.user.count({
        where: {
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),

      // Project stats individually
      this.prisma.project.count({
        where: { status: { in: ['PENDING', 'APPROVED'] }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      }),
      this.prisma.project.count({
        where: { status: 'PROGRESS', OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      }),
      this.prisma.project.count({
        where: { status: 'ACTIVE', OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      }),
      this.prisma.project.count({
        where: { status: 'SUCCESS', OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      }),
      this.prisma.project.count({
        where: { status: { in: ['FAILED', 'EXPIRED'] }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      }),

      // Pending Projects = chờ admin duyệt (only PENDING)
      this.prisma.project.count({
        where: {
          status: 'PENDING',
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),

      // Pending Withdrawals = chờ admin duyệt
      this.prisma.withdrawalRecord.count({
        where: {
          status: 'PENDING',
        },
      }),

      // Pending Milestones = milestone đang chờ admin duyệt (status PROGRESS, order > 1, project ACTIVE)
      this.prisma.milestone.count({
        where: {
          status: 'PROGRESS',
          order: { gt: 1 },
          project: { status: 'ACTIVE' },
        },
      }),

      // Recent project creations
      this.prisma.project.findMany({
        where: {
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
        select: { createdAt: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent withdrawal requests
      this.prisma.withdrawalRecord.findMany({
        select: {
          createdAt: true,
          amount: true,
          milestone: {
            select: { project: { select: { title: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent milestones completed/withdrawn (using MilestoneUpdate for timestamp)
      this.prisma.milestoneUpdate.findMany({
        where: {
          milestone: {
            status: { in: ['COMPLETED', 'WITHDRAWN'] },
          },
        },
        select: {
          updatedAt: true,
          milestone: { select: { title: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Admin Profile
      adminId
        ? this.prisma.admin.findUnique({
            where: { id: adminId },
            select: { avatar: true },
          })
        : Promise.resolve(null),
    ])

    // Merge and sort recent activities
    const activities: ActivityItem[] = [
      ...recentProjects.map((p) => ({
        type: 'PROJECT_LAUNCHED' as ActivityType,
        createdAt: p.createdAt.getTime(),
        title: `Launch: ${p.title}`,
      })),
      ...recentWithdrawals.map((w) => ({
        type: 'WITHDRAWAL_REQUEST' as ActivityType,
        createdAt: w.createdAt.getTime(),
        title: `Withdraw: $${w.amount} (${w.milestone?.project?.title || 'Unknown'})`,
      })),
      ...recentMilestones.map((m) => ({
        type: 'MILESTONE_COMPLETED' as ActivityType,
        createdAt: m.updatedAt.getTime(),
        title: `Phase Done: ${m.milestone.title}`,
      })),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)

    return {
      platformRevenue: revenueAgg._sum.raisedAmount ?? 0,
      activeUsers,
      liveProjects,
      totalUsers,
      pendingProjects,
      pendingWithdrawals,
      pendingMilestones,
      projectStats: {
        total:
          totalProjectsPending +
          totalProjectsFundraising +
          totalProjectsExecuting +
          totalProjectsSuccess +
          totalProjectsFailed,
        pending: totalProjectsPending,
        fundraising: totalProjectsFundraising,
        executing: totalProjectsExecuting,
        success: totalProjectsSuccess,
        failed: totalProjectsFailed,
      },
      adminProfile: adminUser ? { avatar: adminUser.avatar } : undefined,
      recentActivities: activities,
    }
  }
}
