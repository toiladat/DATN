import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/shared/services/prisma.service'
import { MILESTONE_STATUS } from 'src/shared/constants/project.constant'

@Injectable()
export class MilestoneStatusCronjob {
  private readonly logger = new Logger(MilestoneStatusCronjob.name)
  constructor(private prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('Bắt đầu cronjob cập nhật trạng thái Milestone...')
    try {
      const now = new Date()

      // Kích hoạt các milestone đã đến ngày bắt đầu
      const activatedMilestones = await this.prismaService.milestone.updateMany({
        where: {
          status: MILESTONE_STATUS.COMING_SOON,
          startDate: {
            lte: now,
          },
        },
        data: {
          status: MILESTONE_STATUS.PROGRESS,
        },
      })

      this.logger.log(`Đã kích hoạt thành công ${activatedMilestones.count} milestones từ COMING_SOON sang PROGRESS.`)
    } catch (error) {
      this.logger.error('Lỗi khi chạy cronjob cập nhật trạng thái Milestone:', error)
    }
  }
}
