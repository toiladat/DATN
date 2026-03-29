import { createZodDto } from 'nestjs-zod'
import { GetUserParamsSchema } from 'src/routes/user/user.model'

export class GetUserParamsDTO extends createZodDto(GetUserParamsSchema) {}
