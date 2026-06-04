import { Module } from '@nestjs/common'
import { ProjectController } from './project.controller'
import { AdminProjectController } from './admin-project.controller'
import { ProjectService } from './project.service'
import { ProjectRepository } from './project.repo'
import { EmailService } from 'src/shared/services/email.service'
import { AdminDashboardModule } from '../admin-dashboard/admin-dashboard.module'

@Module({
  imports: [AdminDashboardModule],
  controllers: [ProjectController, AdminProjectController],
  providers: [ProjectService, ProjectRepository, EmailService],
  exports: [ProjectService, ProjectRepository],
})
export class ProjectModule {}
