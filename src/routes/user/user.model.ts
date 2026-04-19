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

export type SearchUserQueryParamsType = z.infer<typeof SearchUserQuerySchema>
export type SearchUserQueryResType = z.infer<typeof SearchUserQueryResSchema>
