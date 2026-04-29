import { Injectable } from '@nestjs/common'
import { UserType, UserUpdateType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import { DeviceType, RefreshTokenType, RoleType } from './auth.model'

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // ─── Refresh Tokens ───────────────────────────────────────────────────────────

  createRefreshToken(data: { token: string; userId: string; expiresAt: Date; deviceId: string }) {
    return this.prismaService.refreshToken.create({ data })
  }

  findUniqueRefreshTokenIncludeUserRole(uniqueObject: {
    token: string
  }): Promise<(RefreshTokenType & { user: UserType & { role: RoleType } }) | null> {
    return this.prismaService.refreshToken.findUniqueOrThrow({
      where: uniqueObject,
      include: {
        user: {
          include: { role: true },
        },
      },
    })
  }

  deleteRefreshToken(uniqueObject: { token: string }): Promise<RefreshTokenType> {
    return this.prismaService.refreshToken.delete({ where: uniqueObject })
  }

  // ─── Devices ──────────────────────────────────────────────────────────────────

  createDevice(
    data: Pick<DeviceType, 'userId' | 'userAgent' | 'ip'> & Partial<Pick<DeviceType, 'lastActive' | 'isActive'>>,
  ) {
    return this.prismaService.device.create({ data })
  }

  updateDevice(deviceId: string, data: Partial<DeviceType>): Promise<DeviceType> {
    return this.prismaService.device.update({ where: { id: deviceId }, data })
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  findUniqueUserIncludeRole(
    uniqueObject: { email: string } | { id: string },
  ): Promise<(UserType & { role: RoleType }) | null> {
    // email không còn @unique trong schema (dùng sparse index ở DB)
    // → dùng findFirst thay vì findUnique
    return this.prismaService.user.findFirst({
      where: uniqueObject,
      include: { role: true },
    })
  }

  async updateUser(where: { id: string } | { email: string }, data: Partial<UserUpdateType>): Promise<UserType> {
    if ('id' in where) {
      return this.prismaService.user.update({ where: { id: where.id }, data })
    }
    // email không còn @unique trong Prisma schema → cần find trước rồi update by id
    const user = await this.prismaService.user.findFirst({ where: { email: where.email } })
    if (!user) throw new Error('User not found')
    return this.prismaService.user.update({ where: { id: user.id }, data })
  }

  // ─── Wallet Auth ──────────────────────────────────────────────────────────────

  findUniqueUserByWallet(walletAddress: string): Promise<(UserType & { role: RoleType }) | null> {
    return this.prismaService.user.findUnique({
      where: { walletAddress },
      include: { role: true },
    })
  }

  /**
   * Upsert a user by walletAddress:
   * - New wallet → create a minimal user (no email/password)
   * - Existing wallet → no-op update (nonce stored in Redis, not here)
   */
  upsertUserByWallet(walletAddress: string, roleId: string): Promise<UserType & { role: RoleType }> {
    return this.prismaService.user.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        name: `User_${walletAddress.slice(2, 8)}`,
        roleId,
      },
      update: {},
      include: { role: true },
    })
  }
}
