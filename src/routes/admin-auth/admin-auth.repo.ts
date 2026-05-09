import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { Admin, AdminDevice, AdminRefreshToken } from '@prisma/client'

@Injectable()
export class AdminAuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findAdminByEmail(email: string): Promise<Admin | null> {
    return this.prismaService.admin.findUnique({
      where: { email },
    })
  }

  createAdminDevice(
    data: Pick<AdminDevice, 'adminId' | 'userAgent' | 'ip'> & Partial<Pick<AdminDevice, 'lastActive' | 'isActive'>>,
  ): Promise<AdminDevice> {
    return this.prismaService.adminDevice.create({ data })
  }

  updateAdminDevice(deviceId: string, data: Partial<AdminDevice>): Promise<AdminDevice> {
    return this.prismaService.adminDevice.update({
      where: { id: deviceId },
      data,
    })
  }

  createAdminRefreshToken(data: {
    token: string
    adminId: string
    expiresAt: Date
    deviceId: string
  }): Promise<AdminRefreshToken> {
    return this.prismaService.adminRefreshToken.create({ data })
  }

  findUniqueAdminRefreshToken(token: string): Promise<(AdminRefreshToken & { admin: Admin }) | null> {
    return this.prismaService.adminRefreshToken.findUniqueOrThrow({
      where: { token },
      include: {
        admin: true,
      },
    })
  }

  deleteAdminRefreshToken(token: string): Promise<AdminRefreshToken> {
    return this.prismaService.adminRefreshToken.delete({
      where: { token },
    })
  }
}
