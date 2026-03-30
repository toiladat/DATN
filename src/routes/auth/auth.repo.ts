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
    return this.prismaService.user.findUnique({
      where: uniqueObject,
      include: { role: true },
    })
  }

  updateUser(where: { id: string } | { email: string }, data: Partial<UserUpdateType>): Promise<UserType> {
    return this.prismaService.user.update({ where, data })
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
