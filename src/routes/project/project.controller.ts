import { Body, Controller, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ProjectService } from './project.service'
import { CreateProjectDTO } from './project.dto'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'

@ApiTags('Projects')
@Controller('projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(@ActivateUser('userId') userId: string, @Body() createProjectDto: CreateProjectDTO) {
    return this.projectService.create(userId, createProjectDto)
  }
}
