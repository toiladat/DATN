import { createZodDto } from 'nestjs-zod'
import { CreateProjectBodySchema, CreateProjectRestSchema } from './project.model'

export class CreateProjectBodyDTO extends createZodDto(CreateProjectBodySchema) {}
export class CreateProjectRestDTO extends createZodDto(CreateProjectRestSchema) {}
