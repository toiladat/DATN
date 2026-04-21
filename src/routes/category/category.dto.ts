import { createZodDto } from 'nestjs-zod'
import { CategoryResponseSchema } from './category.model'

export class CategoryResponseDTO extends createZodDto(CategoryResponseSchema) {}
