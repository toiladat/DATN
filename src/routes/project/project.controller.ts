import { Body, Controller, Post, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ProjectService } from './project.service'
import { CreateProjectBodyDTO, CreateProjectRestDTO, ProjectSummaryRestDTO } from './project.dto'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'
import { ZodSerializerDto } from 'nestjs-zod'
import { ApiResponse } from '@nestjs/swagger'

import { Throttle } from '@nestjs/throttler'

@ApiTags('Projects')
@Controller('projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Throttle({ default: { limit: 2, ttl: 60000 } }) // Limit to 2 projects per minute
  @ApiResponse({ status: 201, type: CreateProjectRestDTO })
  @ZodSerializerDto(CreateProjectRestDTO)
  create(@ActivateUser('userId') userId: string, @Body() createProjectDto: CreateProjectBodyDTO) {
    return this.projectService.create(userId, createProjectDto)
  }

  @Get('me')
  @ApiResponse({ status: 200, type: ProjectSummaryRestDTO, description: 'Return list of user projects' })
  @ZodSerializerDto(ProjectSummaryRestDTO)
  getMyProjects(@ActivateUser('userId') userId: string) {
    return this.projectService.getMyProjects(userId)
  }
}
