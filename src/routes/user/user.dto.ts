import { createZodDto } from 'nestjs-zod'
import {
  GetUserParamsSchema,
  SearchUserQuerySchema,
  SearchUserQueryResSchema,
  UpdateUserProfileSchema,
} from 'src/routes/user/user.model'
import { ApiProperty } from '@nestjs/swagger'

export class GetUserParamsDTO extends createZodDto(GetUserParamsSchema) {
  @ApiProperty()
  userId: string
}
export class SearchUserQueryDTO extends createZodDto(SearchUserQuerySchema) {
  @ApiProperty({ name: 'keyword' })
  keyword: string
}
export class SearchUserQueryResDTO extends createZodDto(SearchUserQueryResSchema) {}

export class UpdateUserProfileBodyDTO extends createZodDto(UpdateUserProfileSchema) {}
