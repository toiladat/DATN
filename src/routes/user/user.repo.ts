import { Injectable } from '@nestjs/common'
import { UserProfileType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import { SearchUserQueryParamsType, UpdateUserProfileType } from './user.model'
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
}
