import { Body, Controller, Post, Get, Delete, Param, Query, Put } from '@nestjs/common'
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
  CreateReviewBodyDTO,
  UpdateReviewBodyDTO,
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
  getAllProjects(@Query() query: ProjectQueryDTO, @ActivateUser('userId') userId?: string) {
    return this.projectService.getAllProjects(
      query.page,
      query.limit,
      query.search,
      query.categorySlug,
      query.sort,
      userId,
    )
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

  @Post(':id/like')
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async likeProject(@Param('id') id: string, @ActivateUser('userId') userId: string) {
    await this.projectService.likeProject(id, userId)
    return { message: 'Project liked successfully' }
  }

  @Delete(':id/like')
  @ApiResponse({ status: 200, type: MessageResDTO })
  @ZodSerializerDto(MessageResDTO)
  async unlikeProject(@Param('id') id: string, @ActivateUser('userId') userId: string) {
    await this.projectService.unlikeProject(id, userId)
    return { message: 'Project unliked successfully' }
  }

  // --- REVIEWS ---

  @Get(':id/reviews')
  @IsPublic()
  @ApiResponse({ status: 200 })
  getReviews(@Param('id') id: string) {
    return this.projectService.getReviews(id)
  }

  @Post(':id/reviews')
  @ApiResponse({ status: 201 })
  createReview(@Param('id') id: string, @Body() body: CreateReviewBodyDTO, @ActivateUser('userId') userId: string) {
    return this.projectService.createReview(userId, id, body.content, body.parentId)
  }

  @Put(':id/reviews/:reviewId')
  @ApiResponse({ status: 200 })
  updateReview(
    @Param('reviewId') reviewId: string,
    @Body() body: UpdateReviewBodyDTO,
    @ActivateUser('userId') userId: string,
  ) {
    return this.projectService.updateReview(userId, reviewId, body.content)
  }

  @Delete(':id/reviews/:reviewId')
  @ApiResponse({ status: 200 })
  deleteReview(@Param('reviewId') reviewId: string, @ActivateUser('userId') userId: string) {
    return this.projectService.deleteReview(userId, reviewId)
  }
}
