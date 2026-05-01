import { z } from 'zod'
import { UserProfileSchema } from 'src/shared/models/shared-user.model'

export const GetUserParamsSchema = z
  .object({
    userId: z.string(),
  })
  .strict()

export type GetUserParamsType = z.infer<typeof GetUserParamsSchema>

export const SearchUserQuerySchema = z
  .object({
    keyword: z.string(),
  })
  .strict()

export const SearchUserQueryResSchema = z.object({
  users: z.array(UserProfileSchema),
})

export const UpdateUserProfileSchema = z
  .object({
    name: z.string().optional(),
    biography: z.string().optional(),
    phoneNumber: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    socialLinks: z.array(z.string()).optional(),
    avatar: z.string().url().optional(),
  })
  .strict()

export type UpdateUserProfileType = z.infer<typeof UpdateUserProfileSchema>

export type SearchUserQueryParamsType = z.infer<typeof SearchUserQuerySchema>
export type SearchUserQueryResType = z.infer<typeof SearchUserQueryResSchema>
