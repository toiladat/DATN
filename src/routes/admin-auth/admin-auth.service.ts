import { HttpException, Injectable } from '@nestjs/common'
import {
  AdminAccountDisabledException,
  AdminInvalidCredentialsException,
  AdminRefreshTokenAlreadyUsedException,
  AdminUnauthorizedException,
} from './admin-auth.error'
import { isNotFoundPrismaError } from 'src/shared/helpers'
import { HashingService } from 'src/shared/services/hashing.service'
import { TokenService } from 'src/shared/services/token.service'
import { AdminAuthRepository } from './admin-auth.repo'
import { AdminLoginBodyType, AdminRefreshTokenBodyType } from './admin-auth.model'
import { AdminAccessTokenPayloadCreate } from 'src/shared/types/jwt.type'

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  async generateTokens({ adminId, deviceId }: AdminAccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAdminAccessToken({ adminId, deviceId }),
      this.tokenService.signAdminRefreshToken({ adminId }),
    ])

    const decodeRefreshToken = await this.tokenService.verifyAdminRefreshToken(refreshToken)
    await this.adminAuthRepository.createAdminRefreshToken({
      token: refreshToken,
      adminId,
      expiresAt: new Date(decodeRefreshToken.exp * 1000),
      deviceId,
    })
    return { accessToken, refreshToken }
  }

  async login({ email, password, userAgent, ip }: AdminLoginBodyType & { userAgent: string; ip: string }) {
    const admin = await this.adminAuthRepository.findAdminByEmail(email)
    if (!admin) throw AdminInvalidCredentialsException

    const isMatch = await this.hashingService.compare(password, admin.password)
    if (!isMatch) throw AdminInvalidCredentialsException

    if (!admin.isActive) throw AdminAccountDisabledException

    const device = await this.adminAuthRepository.createAdminDevice({
      adminId: admin.id,
      ip,
      userAgent,
    })

    return this.generateTokens({
      adminId: admin.id,
      deviceId: device.id,
    })
  }

  async refreshToken({ refreshToken, userAgent, ip }: AdminRefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      const { adminId } = await this.tokenService.verifyAdminRefreshToken(refreshToken)

      const refreshTokenInDB = await this.adminAuthRepository.findUniqueAdminRefreshToken(refreshToken)

      if (!refreshTokenInDB) {
        throw AdminRefreshTokenAlreadyUsedException
      }

      if (!refreshTokenInDB.admin.isActive) {
        throw AdminAccountDisabledException
      }

      const { deviceId } = refreshTokenInDB

      const $updateDevice = this.adminAuthRepository.updateAdminDevice(deviceId, {
        ip,
        userAgent,
      })

      const $deleteRefreshToken = this.adminAuthRepository.deleteAdminRefreshToken(refreshToken)

      const $token = this.generateTokens({ adminId, deviceId })

      const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $token])
      return tokens
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw AdminUnauthorizedException
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyAdminRefreshToken(refreshToken)
      const deletedRefreshToken = await this.adminAuthRepository.deleteAdminRefreshToken(refreshToken)
      await this.adminAuthRepository.updateAdminDevice(deletedRefreshToken.deviceId, { isActive: false })
      return { message: 'Logout successfully' }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw AdminRefreshTokenAlreadyUsedException
      throw AdminUnauthorizedException
    }
  }
}
