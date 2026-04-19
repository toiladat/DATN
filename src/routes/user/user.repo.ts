import { Injectable } from '@nestjs/common'
import { UserProfileType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class UserRepo {
  constructor(private prismaService: PrismaService) {}

  async findById(id: string): Promise<UserProfileType> {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        phoneNumber: true,
        walletAddress: true,
      },
    }) as Promise<UserProfileType>
  }
}
