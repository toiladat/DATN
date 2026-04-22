import { Injectable } from '@nestjs/common'
import { ProjectRepository } from './project.repo'
import { CreateProjectBodyType } from './project.model'

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async create(ownerId: string, data: CreateProjectBodyType) {
    return this.projectRepo.createProject(ownerId, data)
  }

  async getMyProjects(userId: string) {
    return this.projectRepo.getMyProjects(userId)
  }
}
