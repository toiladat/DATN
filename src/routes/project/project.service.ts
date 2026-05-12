import { Injectable } from '@nestjs/common'
import { ProjectRepository } from './project.repo'
import { CreateProjectBodyType, UpdateMilestoneProgressBodyType } from './project.model'
import { EmailService } from 'src/shared/services/email.service'

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly emailService: EmailService,
  ) {}

  async create(ownerId: string, data: CreateProjectBodyType) {
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

  async submitLaunchTx(projectId: string, txHash: string) {
    await this.projectRepo.submitLaunchTx(projectId, txHash)
    return { message: 'Launch transaction submitted' }
  }

  async getMyProjects(userId: string) {
    return this.projectRepo.getMyProjects(userId)
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
    return this.projectRepo.submitWithdrawMilestone(userId, projectId, milestoneId, txHash)
  }
}
