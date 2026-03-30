import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { UserAgent } from './../../shared/decorators/user-agent.decorator'
import {
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  GetNonceQueryDTO,
  GetNonceResDTO,
  WalletLoginBodyDTO,
  WalletLoginResDTO,
} from './auth.dto'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh-token')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RefreshTokenResDTO)
  refreshToken(@Body() body: RefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip,
    })
  }

  @Post('logout')
  @ZodSerializerDto(MessageResDTO)
  logout(@Body() body: RefreshTokenBodyDTO) {
    return this.authService.logout(body.refreshToken)
  }

  // ─── Wallet Auth ─────────────────────────────────────────────────────────────

  @Get('nonce')
  @IsPublic()
  @ZodSerializerDto(GetNonceResDTO)
  getNonce(@Query() query: GetNonceQueryDTO) {
    return this.authService.getNonce(query)
  }

  @Post('wallet-login')
  @IsPublic()
  @ZodSerializerDto(WalletLoginResDTO)
  walletLogin(@Body() body: WalletLoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.authService.walletLogin({
      ...body,
      userAgent,
      ip,
    })
  }
}
