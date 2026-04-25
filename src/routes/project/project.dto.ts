import { createZodDto } from 'nestjs-zod'
import {
  CreateProjectBodySchema,
  CreateProjectRestSchema,
  ProjectSummaryRestSchema,
  UpdateMilestoneProgressBodySchema,
  ProjectDetailRestSchema,
} from './project.model'

export class CreateProjectBodyDTO extends createZodDto(CreateProjectBodySchema) {}
export class CreateProjectRestDTO extends createZodDto(CreateProjectRestSchema) {}
export class ProjectSummaryRestDTO extends createZodDto(ProjectSummaryRestSchema) {}
export class UpdateMilestoneProgressBodyDTO extends createZodDto(UpdateMilestoneProgressBodySchema) {}
export class ProjectDetailRestDTO extends createZodDto(ProjectDetailRestSchema) {}
