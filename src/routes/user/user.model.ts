import { z } from 'zod'
import { UserProfileSchema, UserSchema } from 'src/shared/models/shared-user.model'
import { UserStatus } from 'src/shared/constants/auth.constant'

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

export const GetAdminUsersQuerySchema = z.object({
  keyword: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export const GetAdminUsersResSchema = z.object({
  data: z.array(UserProfileSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

export type GetAdminUsersQueryType = z.infer<typeof GetAdminUsersQuerySchema>
export type GetAdminUsersResType = z.infer<typeof GetAdminUsersResSchema>

export const GetAdminUserDetailResSchema = z.object({
  user: UserSchema,
  stats: z.object({
    projects: z.object({
      total: z.number(),
      success: z.number(),
      failed: z.number(),
      pending: z.number(),
      fundraising: z.number(),
      executing: z.number(),
    }),
    financials: z.object({
      totalReceived: z.number(),
      totalInvestmentsCount: z.number(),
      totalInvestedAmount: z.number(),
    }),
  }),
})

export type GetAdminUserDetailResType = z.infer<typeof GetAdminUserDetailResSchema>
