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
      totalRaised: z.number(),
      totalInvestmentsCount: z.number(),
      totalInvestedAmount: z.number(),
    }),
  }),
})

export type GetAdminUserDetailResType = z.infer<typeof GetAdminUserDetailResSchema>

export const GetWalletProjectsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SUCCESS']).optional(),
})

export const WalletProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  image: z.string().optional(),
  daysLeft: z.number(),
  currentPhase: z.number(),
  totalPhases: z.number(),
})

export const GetWalletProjectsResSchema = z.object({
  data: z.array(WalletProjectSchema),
})

export const ProjectWithdrawalSchema = z.object({
  id: z.string(),
  amount: z.number(),
  createdAt: z.date().or(z.string()),
  milestone: z.object({
    title: z.string(),
    image: z.string().optional(),
  }),
})

export const GetProjectWithdrawalsResSchema = z.object({
  data: z.array(ProjectWithdrawalSchema),
})

export type GetWalletProjectsQueryType = z.infer<typeof GetWalletProjectsQuerySchema>
export type GetWalletProjectsResType = z.infer<typeof GetWalletProjectsResSchema>
export type GetProjectWithdrawalsResType = z.infer<typeof GetProjectWithdrawalsResSchema>

export const UserInvestmentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  content: z.string().nullable().optional(),
  txHash: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
  createdAt: z.date().or(z.string()),
  project: z.object({
    id: z.string(),
    title: z.string(),
    image: z.string().optional(),
  }),
})

export const GetInvestmentsResSchema = z.object({
  data: z.array(UserInvestmentSchema),
})

export type GetInvestmentsResType = z.infer<typeof GetInvestmentsResSchema>

// ─── Admin User Projects ───────────────────────────────────────────────────────

export const AdminUserProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  status: z.enum(['pending', 'progress', 'active', 'success', 'rejected']),
  fundingGoal: z.number(),
  raisedAmount: z.number(),
  primaryCategory: z.string().optional(),
  startDate: z.number(),
  endDate: z.number(),
  updatedAt: z.number(),
  totalMilestones: z.number(),
  completedMilestones: z.number(),
})

export const GetAdminUserProjectsResSchema = z.object({
  data: z.array(AdminUserProjectSchema),
})

export type AdminUserProjectType = z.infer<typeof AdminUserProjectSchema>
export type GetAdminUserProjectsResType = z.infer<typeof GetAdminUserProjectsResSchema>
