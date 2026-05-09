import { createZodDto } from 'nestjs-zod'
import {
  AdminAuthResSchema,
  AdminLoginBodySchema,
  AdminLogoutBodySchema,
  AdminRefreshTokenBodySchema,
} from './admin-auth.model'

export class AdminLoginBodyDTO extends createZodDto(AdminLoginBodySchema) {}
export class AdminAuthResDTO extends createZodDto(AdminAuthResSchema) {}
export class AdminRefreshTokenBodyDTO extends createZodDto(AdminRefreshTokenBodySchema) {}
export class AdminLogoutBodyDTO extends createZodDto(AdminLogoutBodySchema) {}
