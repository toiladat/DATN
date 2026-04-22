import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateProjectBodyType, CreateProjectRestType } from './project.model'
import { generateSlug } from 'src/shared/helpers'
import {
  INVESTMENT_STATUS,
  PROJECT_STATUS,
  DEFAULT_CATEGORY_NAME,
  MILESTONE_STATUS,
} from 'src/shared/constants/project.constant'
@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(ownerId: string, data: CreateProjectBodyType): Promise<CreateProjectRestType> {
    const projectSlug = generateSlug(data.basics.title)

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Project
      const project = await tx.project.create({
        data: {
          title: data.basics.title,
          slug: projectSlug,
          subtitle: data.basics.subtitle,
          images: data.basics.image,
          totalAmount: data.basics.fundingGoal,
          startDate: new Date(data.basics.startDate),
          endDate: new Date(data.basics.endDate),
          userId: ownerId,
        },
      })

      // Create primary category relation
      if (data.basics.primaryCategory) {
        await tx.projectCategory.create({
          data: {
            projectId: project.id,
            categoryId: data.basics.primaryCategory,
          },
        })
      }

      // 2. Create Milestones
      if (data.milestones && data.milestones.length > 0) {
        await tx.milestone.createMany({
          data: data.milestones.map((ms, index) => ({
            projectId: project.id,
            order: index + 1,
            title: ms.name,
            description: ms.description,
            slug: generateSlug(ms.name) + '-' + Math.random().toString(36).substring(2, 7),
            amount: ms.budget,
            startDate: new Date(ms.startDate),
            endDate: new Date(ms.endDate),
            advantages: ms.advantages || '',
            challenges: ms.challenges || '',
            outcome: ms.expectedOutcome,
            images: ms.images,
          })),
        })
      }

      // 3. Create Project Members
      if (data.team && data.team.length > 0) {
        await tx.projectMember.createMany({
          data: data.team.map((m) => ({
            projectId: project.id,
            userId: m.id, // ID from searched users
            role: m.role,
          })),
        })
      }

      return { id: project.id }
    })
  }

  async getMyProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        investments: true,
        milestones: true,
        projectCategories: {
          include: { category: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      projects: projects.map((p) => {
        const raisedAmount = p.investments.reduce((sum, inv) => {
          return inv.status === INVESTMENT_STATUS.SUCCESS ? sum + inv.amount : sum
        }, 0)

        let mappedStatus = 'pending'
        if (p.status === PROJECT_STATUS.PROGRESS) mappedStatus = 'progress'
        else if (p.status === PROJECT_STATUS.ACTIVE) mappedStatus = 'active'
        else if (p.status === PROJECT_STATUS.SUCCESS) mappedStatus = 'success'
        else if (p.status === PROJECT_STATUS.FAILED || p.status === PROJECT_STATUS.EXPIRED) mappedStatus = 'rejected'

        const primaryCat = p.projectCategories[0]?.category?.name || DEFAULT_CATEGORY_NAME

        const totalMilestones = p.milestones.length
        const completedMilestones = p.milestones.filter((m) => m.status === MILESTONE_STATUS.COMPLETED).length

        return {
          id: p.id,
          title: p.title,
          description: p.subtitle,
          status: mappedStatus,
          fundingGoal: p.totalAmount,
          raisedAmount,
          image: p.images[0] || null,
          primaryCategory: primaryCat,
          startDate: p.startDate.getTime(),
          endDate: p.endDate.getTime(),
          updatedAt: p.updatedAt.getTime(),
          totalMilestones,
          completedMilestones,
        }
      }),
    }
  }
}
