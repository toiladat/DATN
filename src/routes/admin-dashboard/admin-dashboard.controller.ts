import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AdminDashboardService } from './admin-dashboard.service'
import { AdminAccessTokenGuard } from 'src/shared/guards/admin-access-token.guard'

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    const adminId = req.user?.adminId
    const stats = await this.adminDashboardService.getStats(adminId)
    return stats
  }
}
