import { Injectable } from '@nestjs/common'
import { UserProfileType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  GetAdminUsersQueryType,
  SearchUserQueryParamsType,
  UpdateUserProfileType,
  GetAdminUserDetailResType,
} from './user.model'
import { InvestmentStatus } from '@prisma/client'
import {
  PROJECT_STATUS,
  MILESTONE_STATUS,
  INVESTMENT_STATUS,
  WITHDRAWAL_STATUS,
} from 'src/shared/constants/project.constant'
import { UserNotFoundException, ProjectNotFoundForUserException } from './user.error'
@Injectable()
export class UserRepo {
  constructor(private prismaService: PrismaService) {}

  async findById(id: string): Promise<UserProfileType | null> {
    return this.prismaService.user.findUnique({
      where: { id },
    })
  }

  async search(query: SearchUserQueryParamsType): Promise<UserProfileType[]> {
    const keyword = String(query.keyword).trim()

    const users = await this.prismaService.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            walletAddress: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 5,
    })
    return users
  }

  async updateProfile(id: string, data: UpdateUserProfileType): Promise<UserProfileType> {
    return this.prismaService.user.update({
      where: { id },
      data,
    })
  }

  async findAdminUsers(query: GetAdminUsersQueryType) {
    const { keyword, status, page, limit } = query
    const whereClause: any = {}

    if (status) {
      whereClause.status = status
    }

    if (keyword) {
      whereClause.OR = [
        { email: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { walletAddress: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where: whereClause }),
    ])

    return { data, total, page, limit }
  }

  async getAdminUserDetail(id: string): Promise<GetAdminUserDetailResType> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw UserNotFoundException
    }

    const projectsGroup = await this.prismaService.project.groupBy({
      by: ['status'],
      where: {
        userId: id,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      _count: true,
      _sum: {
        raisedAmount: true,
      },
    })

    let totalProjects = 0
    let success = 0
    let failed = 0
    let pending = 0
    let fundraising = 0
    let executing = 0
    let totalRaised = 0

    projectsGroup.forEach((group) => {
      const count = group._count
      totalProjects += count
      totalRaised += group._sum.raisedAmount || 0

      switch (group.status) {
        case PROJECT_STATUS.SUCCESS:
          success += count
          break
        case PROJECT_STATUS.FAILED:
        case PROJECT_STATUS.EXPIRED:
          failed += count
          break
        case PROJECT_STATUS.PENDING:
        case PROJECT_STATUS.APPROVED:
          pending += count
          break
        case PROJECT_STATUS.PROGRESS:
          fundraising += count
          break
        case PROJECT_STATUS.ACTIVE:
          executing += count
          break
      }
    })

    const investmentsAgg = await this.prismaService.investment.aggregate({
      where: {
        userId: id,
        status: INVESTMENT_STATUS.SUCCESS,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      _count: true,
      _sum: {
        amount: true,
      },
    })

    const withdrawalsAgg = await this.prismaService.withdrawalRecord.aggregate({
      where: {
        milestone: {
          project: {
            userId: id,
          },
        },
        status: WITHDRAWAL_STATUS.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    })

    const totalReceived = withdrawalsAgg._sum.amount || 0

    return {
      user,
      stats: {
        projects: {
          total: totalProjects,
          success,
          failed,
          pending,
          fundraising,
          executing,
        },
        financials: {
          totalReceived,
          totalRaised,
          totalInvestmentsCount: investmentsAgg._count || 0,
          totalInvestedAmount: investmentsAgg._sum.amount || 0,
        },
      },
    }
  }

  async banUser(id: string) {
    const user = await this.prismaService.user.update({
      where: { id },
      data: { status: 'BLOCKED' },
    })
    return user
  }

  async unbanUser(id: string) {
    const user = await this.prismaService.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })
    return user
  }

  async getWalletProjects(userId: string, status?: 'ACTIVE' | 'SUCCESS') {
    const whereClause: any = {
      userId,
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    }

    if (status) {
      whereClause.status = status
    } else {
      whereClause.status = { in: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.SUCCESS] }
    }

    const projects = await this.prismaService.project.findMany({
      where: whereClause,
      include: {
        milestones: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: projects.map((p) => {
        const totalPhases = p.milestones.length
        const currentPhase = p.milestones.filter((m) =>
          [MILESTONE_STATUS.COMPLETED, MILESTONE_STATUS.APPROVED, MILESTONE_STATUS.WITHDRAWN].includes(m.status as any),
        ).length
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(p.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        )

        return {
          id: p.id,
          title: p.title,
          image: p.images && p.images.length > 0 ? p.images[0] : undefined,
          daysLeft,
          currentPhase,
          totalPhases,
        }
      }),
    }
  }

  async getProjectWithdrawals(userId: string, projectId: string) {
    // Optionally verify project belongs to user
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId, userId },
    })
    if (!project) {
      throw ProjectNotFoundForUserException
    }

    const withdrawals = await this.prismaService.withdrawalRecord.findMany({
      where: {
        projectId,
      },
      include: {
        milestone: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      data: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        createdAt: w.createdAt.toISOString(),
        milestone: {
          title: w.milestone.title,
          image: w.milestone.images && w.milestone.images.length > 0 ? w.milestone.images[0] : undefined,
        },
      })),
    }
  }

  async getUserInvestments(userId: string) {
    const investments = await this.prismaService.investment.findMany({
      where: {
        userId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        status: InvestmentStatus.SUCCESS,
      },
      include: {
        project: true,
      },
      orderBy: { createdAt: 'asc' }, // "từ sớm nhất đến muộn nhất"
    })

    return {
      data: investments.map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        content: inv.content,
        txHash: inv.txHash,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        project: {
          id: inv.project.id,
          title: inv.project.title,
          image: inv.project.images && inv.project.images.length > 0 ? inv.project.images[0] : undefined,
        },
      })),
    }
  }

  async getAdminUserProjects(userId: string) {
    const STATUS_MAP: Record<string, 'pending' | 'progress' | 'active' | 'success' | 'rejected'> = {
      PENDING: 'pending',
      APPROVED: 'pending',
      PROGRESS: 'progress',
      ACTIVE: 'active',
      SUCCESS: 'success',
      FAILED: 'rejected',
      EXPIRED: 'rejected',
    }

    const projects = await this.prismaService.project.findMany({
      where: {
        userId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      include: {
        milestones: true,
        projectCategories: {
          include: { category: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      data: projects.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle ?? null,
        image: p.images && p.images.length > 0 ? p.images[0] : null,
        status: STATUS_MAP[p.status] ?? 'pending',
        fundingGoal: p.totalAmount,
        raisedAmount: p.raisedAmount,
        primaryCategory: p.projectCategories[0]?.category?.name ?? 'General',
        startDate: p.startDate.getTime(),
        endDate: p.endDate.getTime(),
        updatedAt: p.updatedAt.getTime(),
        totalMilestones: p.milestones.length,
        completedMilestones: p.milestones.filter((m) =>
          [MILESTONE_STATUS.COMPLETED, MILESTONE_STATUS.APPROVED, MILESTONE_STATUS.WITHDRAWN].includes(m.status as any),
        ).length,
      })),
    }
  }
}
