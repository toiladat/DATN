import { createZodDto } from 'nestjs-zod'
import { ApiProperty } from '@nestjs/swagger'
import {
  CreateProjectBodySchema,
  CreateProjectRestSchema,
  ProjectSummaryRestSchema,
  PaginatedProjectSummaryRestSchema,
  UpdateMilestoneProgressBodySchema,
  ProjectDetailRestSchema,
  ProjectQuerySchema,
} from './project.model'

export class CreateProjectBodyDTO extends createZodDto(CreateProjectBodySchema) {}
export class CreateProjectRestDTO extends createZodDto(CreateProjectRestSchema) {}
export class ProjectSummaryRestDTO extends createZodDto(ProjectSummaryRestSchema) {}
export class PaginatedProjectSummaryRestDTO extends createZodDto(PaginatedProjectSummaryRestSchema) {}
export class UpdateMilestoneProgressBodyDTO extends createZodDto(UpdateMilestoneProgressBodySchema) {}
export class ProjectDetailRestDTO extends createZodDto(ProjectDetailRestSchema) {}

export class ProjectQueryDTO extends createZodDto(ProjectQuerySchema) {
  @ApiProperty({ default: 1 })
  page: number

  @ApiProperty({ default: 6 })
  limit: number

  @ApiProperty({ required: false, description: 'Search by project title' })
  search?: string

  @ApiProperty({ required: false, description: 'Filter by category slug' })
  categorySlug?: string
}
