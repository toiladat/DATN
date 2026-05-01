import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { UserType } from '../models/shared-user.model'

export type WhereUniqueUserType = { id: string } | { email: string }

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findUnique(where: WhereUniqueUserType): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null,
      },
    })
  }

  findById(id: string): Promise<UserType | null> {
    return this.prismaService.user.findUnique({
      where: { id },
    })
  }

  updateProfile(id: string, data: any): Promise<UserType> {
    return this.prismaService.user.update({
      where: { id },
      data,
    })
  }
}
