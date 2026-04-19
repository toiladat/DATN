import { Injectable } from '@nestjs/common'
import { ProjectRepository } from './project.repo'
import { CreateProjectType } from './project.model'

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async create(ownerId: string, data: CreateProjectType) {
    // In the future, we might handle file uploads here before passing URLs to the repo
    return this.projectRepo.createProject(ownerId, data)
  }
}
