import { z } from 'zod'
import { PaginationQuerySchema } from 'src/shared/models/request.model'

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

export const CreateProjectBodySchema = z.object({
  basics: CreateProjectBasicsSchema,
  milestones: z.array(CreateMilestoneSchema),
  team: z.array(CreateTeamMemberSchema),
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
      startDate: z.number(),
      endDate: z.number(),
      updatedAt: z.number(),
      totalMilestones: z.number().optional(),
      completedMilestones: z.number().optional(),
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
    }),
  ),
  milestones: z.array(MilestoneRestSchema),
  projectMembers: z.array(z.any()),
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
export const ProjectQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  categorySlug: z.string().optional(),
})
export type ProjectQueryType = z.infer<typeof ProjectQuerySchema>
