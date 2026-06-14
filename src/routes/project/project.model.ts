import { z } from 'zod'
import { PaginationQuerySchema } from 'src/shared/models/request.model'
import { PROJECT_SORT } from 'src/shared/constants/project.constant'

export const ProjectBasicsSchema = z.object({
  title: z.string().min(1, 'Project Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  primaryCategory: z.string().min(1, 'Primary Category is required'),
  secondaryCategory: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  image: z.array(z.string()).min(1, 'At least 1 Reference Image is required'),
  video: z.string().optional(),
  fundingGoal: z.number().positive('Funding goal must be a positive number'),
  startDate: z.string().min(1, 'Start Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  description: z.string().min(1, 'Project Description is required'),
  risks: z.string().min(1, 'Risks & Challenges are required'),
})

export const CreateProjectBasicsSchema = ProjectBasicsSchema.strict()

export const MilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone Name is required'),
  description: z.string().min(1, 'Description is required'),
  durationDays: z.number().int().positive('Duration must be greater than 0'),
  startDate: z.string().min(1, 'Start Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  budget: z.number().positive('Budget Allocation must be greater than 0'),
  advantages: z.string().optional(),
  challenges: z.string().optional(),
  images: z.array(z.string()).min(1, 'Reference Image is required'),
  expectedOutcome: z.string().min(1, 'Expected Outcome is required'),
})

export const MilestoneUpdateSchema = z.object({
  completed: z.string(),
  blockers: z.string(),
  images: z.array(z.string()),
  video: z.string(),
  link: z.string().nullable().optional(),
  isLate: z.boolean().optional(),
})

export const CreateMilestoneSchema = MilestoneSchema.strict()

export const CreateTeamMemberSchema = z.object({
  id: z.string().min(1, 'ID required'), // This corresponds to User ID in our platform
  role: z.string().min(1, 'Role is required'),
  roleDescription: z.string(),
})

export const CreateProjectAttachmentSchema = z.object({
  url: z.string().url(),
  category: z.string(),
  customCategoryName: z.string().optional(),
  description: z.string().optional(),
})

export const CreateProjectBodySchema = z.object({
  basics: CreateProjectBasicsSchema,
  milestones: z.array(CreateMilestoneSchema),
  team: z.array(CreateTeamMemberSchema),
  attachments: z.array(CreateProjectAttachmentSchema).optional(),
})

export const CreateProjectRestSchema = z.object({
  id: z.string(),
})

export const ProjectSummaryRestSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      fundingGoal: z.number(),
      raisedAmount: z.number(),
      image: z.string().nullable().optional(),
      primaryCategory: z.string().optional(),
      investorsCount: z.number().optional(),
      topInvestorsAvatars: z.array(z.string()).optional(),
      likesCount: z.number().optional(),
      isLiked: z.boolean().optional(),
      startDate: z.number(),
      endDate: z.number(),
      updatedAt: z.number(),
      totalMilestones: z.number().optional(),
      completedMilestones: z.number().optional(),
      myInvestmentAmount: z.number().optional(),
      investedAt: z.number().optional(),
      hasRefunded: z.boolean().optional(),
      refundAmount: z.number().optional(),
      rejectReason: z.string().optional(),
    }),
  ),
})
export const PaginatedProjectSummaryRestSchema = ProjectSummaryRestSchema.extend({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const MilestoneRestSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  amount: z.number(),
  startDate: z.date().or(z.string()).or(z.number()),
  endDate: z.date().or(z.string()).or(z.number()),
  status: z.string(),
  advantages: z.string().optional(),
  challenges: z.string().optional(),
  outcome: z.string().optional(),
  images: z.array(z.string()),
  video: z.string().nullable().optional(),
  milestoneUpdates: MilestoneUpdateSchema.nullable(),
})

export const ProjectDetailRestSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string(),
  images: z.array(z.string()),
  video: z.string().optional().nullable(),
  location: z.string(),
  description: z.string(),
  risks: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  startDate: z.date().or(z.string()).or(z.number()),
  endDate: z.date().or(z.string()).or(z.number()),
  userId: z.string(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      avatar: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      walletAddress: z.string(),
    })
    .optional(),
  raisedAmount: z.number(),
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  stats: z.object({
    likes: z.number(),
    reviews: z.number(),
  }),
  topInvestors: z.array(
    z.object({
      amount: z.number(),
      name: z.string().optional(),
      avatar: z.string().optional(),
      content: z.string().nullable().optional(),
      createdAt: z.date().optional(),
    }),
  ),
  recentInvestors: z.array(
    z.object({
      amount: z.number(),
      name: z.string().optional(),
      avatar: z.string().optional(),
      content: z.string().nullable().optional(),
      createdAt: z.date().optional(),
    }),
  ),
  milestones: z.array(MilestoneRestSchema),
  projectMembers: z.array(z.any()),
  projectAttachments: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        category: z.string(),
        customCategoryName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .optional(),
  createdAt: z.date().or(z.string()).or(z.number()),
  updatedAt: z.date().or(z.string()).or(z.number()),
})

export const UpdateMilestoneProgressBodySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  milestoneId: z.string().min(1, 'Milestone ID is required'),
  completed: z.string().min(1, 'Completed description is required'),
  blockers: z.string().default(''),
  images: z.array(z.string().url()).default([]),
  video: z.string().url().optional(),
  link: z.string().url().optional(),
})

export type CreateProjectBodyType = z.infer<typeof CreateProjectBodySchema>
export type CreateProjectRestType = z.infer<typeof CreateProjectRestSchema>
export type ProjectSummaryRestType = z.infer<typeof ProjectSummaryRestSchema>
export type PaginatedProjectSummaryRestType = z.infer<typeof PaginatedProjectSummaryRestSchema>
export type UpdateMilestoneProgressBodyType = z.infer<typeof UpdateMilestoneProgressBodySchema>

// ─── Query schema cho project list (project-specific, không dùng shared) ─────
const SORT_VALUES = Object.values(PROJECT_SORT) as [string, ...string[]]

export const ProjectQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  categorySlug: z.string().optional(),
  sort: z.enum(SORT_VALUES).default(PROJECT_SORT.TRENDING),
})
export type ProjectQueryType = z.infer<typeof ProjectQuerySchema>

export const UserBasicInfoSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  walletAddress: z.string(),
})

export const ReviewRestSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    content: z.string(),
    projectId: z.string(),
    userId: z.string(),
    createdAt: z.number(),
    user: UserBasicInfoSchema.optional(),
    replies: z.array(ReviewRestSchema).optional(),
  }),
)

export const CreateReviewBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  parentId: z.string().optional(),
})

export const UpdateReviewBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
})
export const InvestBodySchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1'),
  txHash: z.string().min(1),
  content: z.string().max(200).optional(),
})
export type InvestBodyType = z.infer<typeof InvestBodySchema>

export const WithdrawMilestoneBodySchema = z.object({
  txHash: z.string().min(1, 'Transaction hash is required'),
})
export type WithdrawMilestoneBodyType = z.infer<typeof WithdrawMilestoneBodySchema>

export const RefundBodySchema = z.object({
  txHash: z.string().min(1, 'Transaction hash is required'),
})
export type RefundBodyType = z.infer<typeof RefundBodySchema>

// ─── Pending Projects (Admin) ────────────────────────────────────────────────

export const PendingProjectUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  walletAddress: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
})

export const PendingProjectItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  status: z.string(),
  fundingGoal: z.number(),
  raisedAmount: z.number(),
  primaryCategory: z.string().optional(),
  startDate: z.number(),
  endDate: z.number(),
  createdAt: z.number(),
  totalMilestones: z.number(),
  user: PendingProjectUserSchema,
})

export const PendingProjectsRestSchema = z.object({
  projects: z.array(PendingProjectItemSchema),
})

export type PendingProjectItemType = z.infer<typeof PendingProjectItemSchema>
export type PendingProjectsRestType = z.infer<typeof PendingProjectsRestSchema>

export const RejectProjectBodySchema = z.object({
  reason: z.string().min(1, 'Reject reason is required'),
})
export type RejectProjectBodyType = z.infer<typeof RejectProjectBodySchema>

export const ProjectStatsRestSchema = z.object({
  total: z.number(),
  fundraising: z.number(),
  active: z.number(),
  success: z.number(),
})
export type ProjectStatsRestType = z.infer<typeof ProjectStatsRestSchema>
