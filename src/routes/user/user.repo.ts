import { Injectable } from '@nestjs/common'
import { UserProfileType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import { GetAdminUsersQueryType, SearchUserQueryParamsType, UpdateUserProfileType } from './user.model'
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
}
