import { createZodDto } from 'nestjs-zod'
import { CreateProjectSchema } from './project.model'

export class CreateProjectDTO extends createZodDto(CreateProjectSchema) {}
