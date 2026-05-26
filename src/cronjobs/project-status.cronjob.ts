import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ethers } from 'ethers'
import { PrismaService } from 'src/shared/services/prisma.service'
import envConfig from 'src/shared/config'
import { PROJECT_STATUS } from 'src/shared/constants/project.constant'

@Injectable()
export class ProjectStatusCronjob {
  private readonly logger = new Logger(ProjectStatusCronjob.name)
  private provider: ethers.JsonRpcProvider
  private wallet: ethers.Wallet
  private contract: ethers.Contract
  private isProcessing = false

  constructor(private readonly prisma: PrismaService) {
    const rpcUrl = envConfig.PROVIDER_URL
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.wallet = new ethers.Wallet(envConfig.ADMIN_PRIVATE_KEY, this.provider)

    const contractAbi = [
      'function projects(uint256) view returns (address creator, uint256 goal, uint256 totalFunded, uint256 fundDeadline, uint256 remainingBalance, uint8 status, uint256 currentMilestone)',
      'function checkAndFailProject(uint256 _projectId) external',
    ]
    this.contract = new ethers.Contract(envConfig.CROWDFUNDING_ADDRESS, contractAbi, this.wallet)
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isProcessing) {
      this.logger.warn('Previous cron job is still running. Skipping this tick.')
      return
    }

    this.isProcessing = true
    try {
      // 1. Tìm các dự án đang ở trạng thái PROGRESS
      const progressProjects = await this.prisma.project.findMany({
        where: {
          status: PROJECT_STATUS.PROGRESS,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      })

      if (progressProjects.length === 0) return

      const currentTimestamp = Math.floor(Date.now() / 1000)

      for (const project of progressProjects) {
        try {
          // Lấy thông tin dự án từ Smart Contract
          const contractProject = await this.contract.projects(BigInt('0x' + project.id))

          const goal = contractProject.goal
          const totalFunded = contractProject.totalFunded
          const fundDeadline = Number(contractProject.fundDeadline)

          // Nếu hết thời gian gọi vốn và chưa đạt mục tiêu
          if (currentTimestamp > fundDeadline && totalFunded < goal) {
            this.logger.log(`Project ${project.id} is overdue and underfunded. Sending transaction to fail project...`)

            // Gọi checkAndFailProject
            const tx = await this.contract.checkAndFailProject(BigInt('0x' + project.id))
            this.logger.log(`Sent checkAndFailProject tx: ${tx.hash}. Waiting for confirmation...`)
            await tx.wait()
            this.logger.log(`checkAndFailProject tx confirmed! Updating DB...`)

            // Cập nhật DB
            await this.prisma.project.update({
              where: { id: project.id },
              data: {
                status: PROJECT_STATUS.FAILED,
                rejectReason: 'Quá hạn gọi vốn nhưng chưa đạt mục tiêu',
              },
            })
            this.logger.log(`Project ${project.id} successfully marked as FAILED in database.`)
          }
        } catch (error) {
          this.logger.error(`Failed to process project ${project.id}: ${error.message}`)
        }
      }
    } catch (error) {
      this.logger.error(`Error in ProjectStatusCronjob: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }
}
