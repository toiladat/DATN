import { createZodDto } from 'nestjs-zod'
import {
  CreateProjectBodySchema,
  CreateProjectRestSchema,
  ProjectSummaryRestSchema,
  PaginatedProjectSummaryRestSchema,
  UpdateMilestoneProgressBodySchema,
  ProjectDetailRestSchema,
} from './project.model'

export class CreateProjectBodyDTO extends createZodDto(CreateProjectBodySchema) {}
export class CreateProjectRestDTO extends createZodDto(CreateProjectRestSchema) {}
export class ProjectSummaryRestDTO extends createZodDto(ProjectSummaryRestSchema) {}
export class PaginatedProjectSummaryRestDTO extends createZodDto(PaginatedProjectSummaryRestSchema) {}
export class UpdateMilestoneProgressBodyDTO extends createZodDto(UpdateMilestoneProgressBodySchema) {}
export class ProjectDetailRestDTO extends createZodDto(ProjectDetailRestSchema) {}
