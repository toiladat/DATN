import { Body, Controller, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthResDTO, AdminLoginBodyDTO, AdminLogoutBodyDTO, AdminRefreshTokenBodyDTO } from './admin-auth.dto'
import { AdminAuthService } from './admin-auth.service'

@ApiTags('Admin Auth')
@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AdminAuthResDTO)
  login(@Body() body: AdminLoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.adminAuthService.login({
      ...body,
      userAgent,
      ip,
    })
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh admin tokens' })
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AdminAuthResDTO)
  refreshToken(@Body() body: AdminRefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return this.adminAuthService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip,
    })
  }

  @Post('logout')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiBearerAuth()
  @IsPublic() // This could also use an AdminAccessTokenGuard, but IsPublic is fine if we just want to revoke the RT
  @ZodSerializerDto(MessageResDTO)
  logout(@Body() body: AdminLogoutBodyDTO) {
    return this.adminAuthService.logout(body.refreshToken)
  }
}
