import { z } from 'zod'

export const CreateProjectBasicsSchema = z.object({
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

export const CreateMilestoneSchema = z.object({
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

export type CreateProjectBodyType = z.infer<typeof CreateProjectBodySchema>
export type CreateProjectRestType = z.infer<typeof CreateProjectRestSchema>
export type ProjectSummaryRestType = z.infer<typeof ProjectSummaryRestSchema>
