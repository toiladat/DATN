import { createZodDto } from 'nestjs-zod'
import { CreateProjectBodySchema, CreateProjectRestSchema, ProjectSummaryRestSchema } from './project.model'

export class CreateProjectBodyDTO extends createZodDto(CreateProjectBodySchema) {}
export class CreateProjectRestDTO extends createZodDto(CreateProjectRestSchema) {}
export class ProjectSummaryRestDTO extends createZodDto(ProjectSummaryRestSchema) {}
