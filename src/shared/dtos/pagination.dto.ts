import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { EmptyBodySchema, PaginationQuerySchema } from './../models/request.model'
export class EmptyBodyDTO extends createZodDto(EmptyBodySchema) {}
export class PaginationQueryDTO extends createZodDto(PaginationQuerySchema) {
  @ApiProperty({ default: 1 })
  page: number

  @ApiProperty({ default: 5 })
  limit: number

  @ApiProperty({ required: false, description: 'Search by project title' })
  search?: string
}
