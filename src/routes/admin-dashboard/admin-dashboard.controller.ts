import { Controller, Get, UseGuards, Req, Sse, Patch, Post, Param, Body } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AdminDashboardService } from './admin-dashboard.service'
import { AdminAccessTokenGuard } from 'src/shared/guards/admin-access-token.guard'
import { SkipThrottle } from '@nestjs/throttler'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const RegisterDeviceTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export class RegisterDeviceTokenDTO extends createZodDto(RegisterDeviceTokenSchema) {}

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @IsPublic()
  @SkipThrottle()
  @Sse('notifications/sse')
  sse() {
    return this.adminDashboardService.getNotificationStream()
  }

  @Get('notifications')
  async getNotifications() {
    return this.adminDashboardService.getNotifications()
  }

  @Patch('notifications/:id/read')
  async markAsRead(@Param('id') id: string) {
    return this.adminDashboardService.markAsRead(id)
  }

  @Post('notifications/read-all')
  async markAllAsRead() {
    return this.adminDashboardService.markAllAsRead()
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const adminId = req.user?.adminId
    const stats = await this.adminDashboardService.getStats(adminId)
    return stats
  }

  @Post('device-token')
  async registerDeviceToken(@Req() req: any, @Body() body: RegisterDeviceTokenDTO) {
    const adminId = req.user?.adminId
    await this.adminDashboardService.registerDeviceToken(adminId, body.token)
    return { message: 'Device token registered successfully' }
  }

  @Post('device-token/deregister')
  async unregisterDeviceToken(@Req() req: any, @Body() body: RegisterDeviceTokenDTO) {
    const adminId = req.user?.adminId
    await this.adminDashboardService.unregisterDeviceToken(adminId, body.token)
    return { message: 'Device token unregistered successfully' }
  }
}
