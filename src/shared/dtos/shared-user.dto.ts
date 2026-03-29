import { createZodDto } from 'nestjs-zod'
import { UserProfileSchema, UserUpdateSchema } from '../models/shared-user.model'

/**
 * Áp dụng cho Response của api GET('profile') và GET('users/:userId')
 */
export class GetUserProfileResDTO extends createZodDto(UserProfileSchema) {}

/**
 * Áp dụng cho Response của api PUT('profile') và PUT('users/:userId')
 */
export class UpdateProfileResDTO extends createZodDto(UserUpdateSchema) {}
