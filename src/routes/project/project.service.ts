import { Injectable, Logger } from '@nestjs/common'
import { ethers } from 'ethers'
import { ProjectRepository } from './project.repo'
import { CreateProjectBodyType, UpdateMilestoneProgressBodyType } from './project.model'
import { EmailService } from 'src/shared/services/email.service'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import envConfig from 'src/shared/config'
import {
  MilestoneNotFoundException,
  BlockchainCancelProjectException,
  ProjectNotFoundException,
  InvalidProjectStatusException,
  MilestoneNotApprovedException,
  MilestoneAlreadyWithdrawnException,
  DuplicateWithdrawalTxException,
  UserKYCRequiredException,
} from './project.error'
import { PROJECT_STATUS, MILESTONE_STATUS } from 'src/shared/constants/project.constant'

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name)

  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly emailService: EmailService,
    private readonly sharedUserRepo: SharedUserRepository,
  ) {}

  async create(ownerId: string, data: CreateProjectBodyType) {
    const user = await this.sharedUserRepo.findById(ownerId)
    if (!user || user.status !== 'ACTIVE') {
      throw UserKYCRequiredException
    }
    return this.projectRepo.createProject(ownerId, data)
  }

  async approveProject(projectId: string) {
    const project = await this.projectRepo.approveProject(projectId)
    const user = (project as any).user
    if (user?.email) {
      this.emailService
        .sendApproveProjectNotification({
          email: user.email,
          name: user.name || user.email,
          projectName: project.title,
        })
        .catch(() => {})
    }
    return { message: 'Project approved successfully' }
  }

  async getPendingProjects() {
    return this.projectRepo.getPendingProjects()
  }

  async rejectProject(projectId: string, reason: string) {
    const project = await this.projectRepo.rejectProject(projectId, reason)
    const user = (project as any).user
    if (user?.email) {
      this.emailService
        .sendRejectProjectNotification({
          email: user.email,
          name: user.name || user.email,
          projectName: project.title,
          reason,
        })
        .catch(() => {})
    }
    return { message: 'Project rejected successfully' }
  }

  // ─── ADMIN MILESTONES ────────────────────────────────────────────────────────

  async getPendingMilestones() {
    return this.projectRepo.getPendingMilestones()
  }

  async approveMilestone(milestoneId: string) {
    const milestone = await this.projectRepo.approveMilestone(milestoneId)
    const user = (milestone as any).project?.user
    if (user?.email) {
      this.emailService
        .sendApproveMilestoneNotification({
          email: user.email,
          name: user.name || user.email,
          projectName: milestone.project?.title || '',
          milestoneTitle: milestone.title || 'Cột mốc',
        })
        .catch(() => {})
    }
    return { message: 'Milestone approved successfully' }
  }

  async rejectMilestone(milestoneId: string, reason: string) {
    // 1. Lấy thông tin dự án để kiểm tra xem đã lên blockchain chưa
    const milestoneInfo = await this.projectRepo.getMilestoneById(milestoneId)
    if (!milestoneInfo || !milestoneInfo.project) {
      throw MilestoneNotFoundException
    }

    const project = milestoneInfo.project
    if (project.status === PROJECT_STATUS.ACTIVE) {
      const privateKey = envConfig.ADMIN_PRIVATE_KEY
      const rpcUrl = envConfig.PROVIDER_URL
      const contractAddress = envConfig.CROWDFUNDING_ADDRESS

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const adminWallet = new ethers.Wallet(privateKey, provider)
      const iface = new ethers.Interface(['function adminCancelProject(uint256 _projectId) external'])
      const contract = new ethers.Contract(contractAddress, iface, adminWallet)

      try {
        this.logger.log(`Cancelling project ${project.id} on blockchain...`)
        // projectId trên blockchain là uint256 từ chuỗi hex của MongoDB UUID
        const projectIdUint256 = BigInt('0x' + project.id)

        const tx = await contract.adminCancelProject(projectIdUint256)
        this.logger.log(`Blockchain tx submitted: ${tx.hash}, waiting for confirmation...`)

        await tx.wait(1)
        this.logger.log(`Project ${project.id} cancelled successfully on blockchain.`)
      } catch (error: any) {
        this.logger.error(`Failed to cancel project on blockchain: ${error.message}`)
        throw BlockchainCancelProjectException
      }
    }

    // 3. Nếu thành công (hoặc dự án chưa ACTIVE), tiến hành cập nhật Database
    const milestone = await this.projectRepo.rejectMilestone(milestoneId, reason)
    const user = (milestone as any).project?.user
    if (user?.email) {
      this.emailService
        .sendRejectMilestoneNotification({
          email: user.email,
          name: user.name || user.email,
          projectName: milestone.project?.title || '',
          milestoneTitle: milestone.title || 'Cột mốc',
          reason,
        })
        .catch(() => {})
    }
    return { message: 'Milestone rejected successfully' }
  }

  async submitLaunchTx(projectId: string, txHash: string) {
    await this.projectRepo.submitLaunchTx(projectId, txHash)
    return { message: 'Launch transaction submitted' }
  }

  async getMyProjects(userId: string) {
    return this.projectRepo.getMyProjects(userId)
  }

  async processRefund(userId: string, projectId: string, txHash: string) {
    return this.projectRepo.processRefund(userId, projectId, txHash)
  }

  async getMyInvestedProjects(userId: string) {
    return this.projectRepo.getMyInvestedProjects(userId)
  }

  async getAllProjects(
    page: number,
    limit: number,
    search?: string,
    categorySlug?: string,
    sort?: string,
    userId?: string,
  ) {
    return this.projectRepo.getAllProjects(page, limit, search, categorySlug, sort as any, userId)
  }

  async delete(id: string, userId: string) {
    return this.projectRepo.deleteProject(id, userId)
  }

  async getById(id: string) {
    return this.projectRepo.getProjectById(id)
  }

  async updateMilestone(userId: string, payload: UpdateMilestoneProgressBodyType) {
    return this.projectRepo.updateMilestoneProgress(userId, payload)
  }

  async invest(projectId: string, userId: string, amount: number, txHash: string, content?: string) {
    return this.projectRepo.createInvestment(projectId, userId, amount, txHash, content)
  }

  async likeProject(id: string, userId: string) {
    return this.projectRepo.likeProject(id, userId)
  }

  async unlikeProject(id: string, userId: string) {
    return this.projectRepo.unlikeProject(id, userId)
  }

  async getReviews(projectId: string) {
    return this.projectRepo.getReviews(projectId)
  }

  async createReview(userId: string, projectId: string, content: string, parentId?: string) {
    return this.projectRepo.createReview(userId, projectId, content, parentId)
  }

  async updateReview(userId: string, reviewId: string, content: string) {
    return this.projectRepo.updateReview(userId, reviewId, content)
  }

  async deleteReview(userId: string, reviewId: string) {
    return this.projectRepo.deleteReview(userId, reviewId)
  }

  async withdrawMilestone(userId: string, projectId: string, milestoneId: string, txHash: string) {
    // 1. Verify project tồn tại và userId là owner
    const project = await this.projectRepo.getProjectForOwner(projectId, userId)
    if (!project) throw ProjectNotFoundException

    // 2. Verify project.status === ACTIVE
    if (project.status !== PROJECT_STATUS.ACTIVE) {
      throw InvalidProjectStatusException
    }

    // 3. Tìm milestone và verify status === APPROVED
    const milestone = await this.projectRepo.getMilestoneForProject(milestoneId, projectId)
    if (!milestone) throw MilestoneNotFoundException

    if (milestone.status !== MILESTONE_STATUS.APPROVED) {
      throw MilestoneNotApprovedException
    }

    // 4. Check đã có WithdrawalRecord chưa (tránh withdraw 2 lần)
    if (milestone.withdrawalRecord !== null) {
      throw MilestoneAlreadyWithdrawnException
    }

    // 5. Check duplicate txHash
    const existingWithdrawal = await this.projectRepo.getWithdrawalRecordByTx(txHash)
    if (existingWithdrawal) throw DuplicateWithdrawalTxException

    // 6. Tạo WithdrawalRecord với status PENDING qua Repository
    return this.projectRepo.submitWithdrawMilestone(milestoneId, projectId, txHash, milestone.amount)
  }
}
