import { Injectable } from '@nestjs/common'
import { UserProfileType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  GetAdminUsersQueryType,
  SearchUserQueryParamsType,
  UpdateUserProfileType,
  GetAdminUserDetailResType,
} from './user.model'
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
      throw new Error('User not found')
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
    let totalReceived = 0

    projectsGroup.forEach((group) => {
      const count = group._count
      totalProjects += count
      totalReceived += group._sum.raisedAmount || 0

      switch (group.status) {
        case 'SUCCESS':
          success += count
          break
        case 'FAILED':
        case 'EXPIRED':
          failed += count
          break
        case 'PENDING':
        case 'APPROVED':
          pending += count
          break
        case 'PROGRESS':
          fundraising += count
          break
        case 'ACTIVE':
          executing += count
          break
      }
    })

    const investmentsAgg = await this.prismaService.investment.aggregate({
      where: {
        userId: id,
        status: 'SUCCESS',
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      _count: true,
      _sum: {
        amount: true,
      },
    })

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
}
