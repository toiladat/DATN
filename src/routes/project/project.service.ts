import { Injectable } from '@nestjs/common'
import { ProjectRepository } from './project.repo'
import { CreateProjectBodyType, UpdateMilestoneProgressBodyType } from './project.model'

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async create(ownerId: string, data: CreateProjectBodyType) {
    return this.projectRepo.createProject(ownerId, data)
  }

  async getMyProjects(userId: string) {
    return this.projectRepo.getMyProjects(userId)
  }

  async getAllProjects(page: number, limit: number, search?: string, categorySlug?: string) {
    return this.projectRepo.getAllProjects(page, limit, search, categorySlug)
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
}
