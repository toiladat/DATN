import { Body, Controller, Post, Get, Delete, Param, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ProjectService } from './project.service'
import {
  CreateProjectBodyDTO,
  CreateProjectRestDTO,
  ProjectSummaryRestDTO,
  PaginatedProjectSummaryRestDTO,
  UpdateMilestoneProgressBodyDTO,
  ProjectDetailRestDTO,
  ProjectQueryDTO,
} from './project.dto'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { ZodSerializerDto } from 'nestjs-zod'
import { ApiResponse } from '@nestjs/swagger'
import { MessageResDTO } from 'src/shared/dtos/response.dto'

import { Throttle } from '@nestjs/throttler'

@ApiTags('Projects')
@Controller('projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @ApiResponse({ status: 201, type: CreateProjectRestDTO })
  @ZodSerializerDto(CreateProjectRestDTO)
  create(@ActivateUser('userId') userId: string, @Body() createProjectDto: CreateProjectBodyDTO) {
    return this.projectService.create(userId, createProjectDto)
  }

  @Get('me')
  @ApiResponse({ status: 200, type: ProjectSummaryRestDTO })
  @ZodSerializerDto(ProjectSummaryRestDTO)
  getMyProjects(@ActivateUser('userId') userId: string) {
    return this.projectService.getMyProjects(userId)
  }

  @Get()
  @IsPublic()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiResponse({ status: 200, type: PaginatedProjectSummaryRestDTO })
  @ZodSerializerDto(PaginatedProjectSummaryRestDTO)
  getAllProjects(@Query() query: ProjectQueryDTO) {
    return this.projectService.getAllProjects(query.page, query.limit, query.search, query.categorySlug, query.sort)
  }

  @Delete(':id')
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async deleteProject(@Param('id') id: string, @ActivateUser('userId') userId: string) {
    await this.projectService.delete(id, userId)
    return { message: 'Project deleted successfully' }
  }

  @Get(':id')
  @IsPublic()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiResponse({ status: 200, type: ProjectDetailRestDTO })
  @ZodSerializerDto(ProjectDetailRestDTO)
  getProjectById(@Param('id') id: string) {
    return this.projectService.getById(id)
  }

  @Post('milestone')
  @ApiResponse({ status: 201, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async updateMilestoneProgress(
    @ActivateUser('userId') userId: string,
    @Body() payload: UpdateMilestoneProgressBodyDTO,
  ) {
    await this.projectService.updateMilestone(userId, payload)
    return { message: 'Milestone progress updated successfully' }
  }
}
