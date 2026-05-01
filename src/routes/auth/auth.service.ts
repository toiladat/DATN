import { HttpException, Inject, Injectable } from '@nestjs/common'
import { verifyMessage } from 'ethers'
import {
  InvalidWalletSignatureException,
  RefreshTokenAlreadyUsedException,
  UnauthorizedAccessException,
  WalletAddressNotFoundException,
  WalletNonceNotFoundException,
} from 'src/routes/auth/auth.error'

import { isNotFoundPrismaError } from 'src/shared/helpers'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { EmailService } from 'src/shared/services/email.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { TokenService } from 'src/shared/services/token.service'
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type'
import { GetNonceQueryType, RefreshTokenBodyType, WalletLoginBodyType } from './auth.model'
import { AuthRepository } from './auth.repo'
import { RolesService } from './roles.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
  ) {}

  async generateTokens({ userId, deviceId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId, deviceId, roleId, roleName }),
      this.tokenService.signRefreshToken({ userId }),
    ])

    const decodeRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodeRefreshToken.exp * 1000),
      deviceId,
    })
    return { accessToken, refreshToken }
  }

  async refreshToken({ refreshToken, userAgent, ip }: RefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      //Kiểm tra token hợp lệ
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)

      const refreshTokenInDB = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({ token: refreshToken })

      if (!refreshTokenInDB) {
        throw RefreshTokenAlreadyUsedException
      }
      const {
        deviceId,
        user: {
          roleId,
          role: { name: roleName },
        },
      } = refreshTokenInDB
      //Cập nhật device
      const $updateDevice = this.authRepository.updateDevice(deviceId, {
        ip,
        userAgent,
      })

      //Xóa RT cũ
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
        token: refreshToken,
      })

      //Tạo AT và RT mới và cập nhật
      const $token = this.generateTokens({ userId, deviceId, roleId, roleName })

      const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $token])
      return tokens
    } catch (error) {
      // mặc định throw UnauthorizedException là instaneOf HttpException
      if (error instanceof HttpException) {
        throw error
      }
      throw UnauthorizedAccessException
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({ token: refreshToken })
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, { isActive: false })
      return { message: 'Logout successfully' }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw RefreshTokenAlreadyUsedException

      throw UnauthorizedAccessException
    }
  }

  // ─── Wallet Auth ─────────────────────────────────────────────────────────────

  /**
   * Step 1: Generate & store a nonce for the given wallet address.
   * Auto-creates the user if this is the first time the address is seen.
   */
  async getNonce({ walletAddress }: GetNonceQueryType) {
    const { v4: uuidv4 } = await import('uuid')
    const rawNonce = uuidv4()
    const nonce = `Please sign this message to authenticate with the app:\n\nNonce: ${rawNonce}`

    const clientRoleId = await this.rolesService.getClientRoleId()
    await this.authRepository.upsertUserByWallet(walletAddress, clientRoleId)

    // Store the nonce in Redis with an expiration time of 5 minutes (300 seconds)
    await this.redisClient.set(`wallet_nonce:${walletAddress.toLowerCase()}`, nonce, 'EX', 300)

    return { nonce }
  }

  /**
   * Step 2: Verify the signed nonce, clear it (replay protection), and issue JWT tokens.
   */
  async walletLogin(body: WalletLoginBodyType & { userAgent: string; ip: string }) {
    const { walletAddress, signature, userAgent, ip } = body

    // 1. Find the user
    const user = await this.authRepository.findUniqueUserByWallet(walletAddress)
    if (!user) throw WalletAddressNotFoundException

    // 2. Make sure a nonce was issued
    const nonce = await this.redisClient.get(`wallet_nonce:${walletAddress.toLowerCase()}`)
    if (!nonce) throw WalletNonceNotFoundException

    // 3. Recover signer from ECDSA signature and compare (case-insensitive)
    let recoveredAddress: string
    try {
      recoveredAddress = verifyMessage(nonce, signature)
    } catch {
      throw InvalidWalletSignatureException
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw InvalidWalletSignatureException
    }

    // 4. Invalidate nonce to prevent replay attacks
    await this.redisClient.del(`wallet_nonce:${walletAddress.toLowerCase()}`)

    // 5. Create device & generate JWT tokens (same as regular login)
    const device = await this.authRepository.createDevice({
      userId: user.id,
      ip,
      userAgent,
    })

    return this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
  }

  // ─── Email Verification (KYC) ───────────────────────────────────────────────

  async requestEmailVerification(userId: string, email: string) {
    const user = await this.sharedUserRepository.findById(userId)
    if (!user) throw UnauthorizedAccessException
    if (user.status === 'ACTIVE') return { message: 'Already verified' }

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store in Redis with 15 mins expiration (using VERIFY_EMAIL concept)
    await this.redisClient.set(`email_verification:${email}`, code, 'EX', 900)

    // TODO: Send actual email via this.emailService
    console.log(`[MOCK EMAIL] To: ${email} - Your verification code is: ${code}`)

    return { message: 'Verification code sent' }
  }

  async verifyEmail(userId: string, email: string, code: string) {
    const user = await this.sharedUserRepository.findById(userId)
    if (!user) throw UnauthorizedAccessException

    const storedCode = await this.redisClient.get(`email_verification:${email}`)
    if (!storedCode || storedCode !== code) {
      throw new HttpException('Invalid or expired verification code', 400)
    }

    // Update user status and email
    await this.sharedUserRepository.updateProfile(userId, {
      status: 'ACTIVE',
      email: email,
    })

    // Delete used code
    await this.redisClient.del(`email_verification:${email}`)

    return { message: 'Email verified successfully', status: 'ACTIVE' }
  }
}
