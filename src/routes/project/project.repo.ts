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
import {
  ProjectNotFoundException,
  UnauthorizedProjectAccessException,
  InvalidProjectStatusException,
  MilestoneNotFoundException,
} from './project.error'
import { UpdateMilestoneProgressBodyType } from './project.model'
@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(ownerId: string, data: CreateProjectBodyType): Promise<CreateProjectRestType> {
    const projectSlug = generateSlug(data.basics.title)

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title: data.basics.title,
          slug: projectSlug,
          subtitle: data.basics.subtitle,
          images: data.basics.image,
          video: data.basics.video,
          location: data.basics.location,
          description: data.basics.description,
          risks: data.basics.risks,
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
      where: {
        userId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
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

  async deleteProject(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
    })

    if (!project) throw ProjectNotFoundException
    if (project.userId !== userId) throw UnauthorizedProjectAccessException

    if (project.status !== PROJECT_STATUS.PENDING) {
      throw InvalidProjectStatusException
    }

    // Soft delete
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      include: {
        _count: {
          select: { likes: true, reviews: true },
        },
        investments: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        milestones: {
          include: {
            milestoneUpdates: true,
          },
        },
        projectCategories: {
          include: { category: true },
        },
        projectMembers: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, email: true, walletAddress: true },
            },
          },
        },
      },
    })

    if (!project) throw ProjectNotFoundException

    const { projectCategories, _count, investments, ...rest } = project

    const raisedAmount = investments.reduce((sum, inv) => {
      return inv.status === INVESTMENT_STATUS.SUCCESS ? sum + inv.amount : sum
    }, 0)

    const topInvestors = [...investments]
      .filter((inv) => inv.status === INVESTMENT_STATUS.SUCCESS) // Consider only successful
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((inv) => ({
        amount: inv.amount,
        name: inv.user?.name,
        avatar: inv.user?.avatar,
      }))

    return {
      ...rest,
      category: projectCategories[0]?.category
        ? { name: projectCategories[0].category.name, slug: projectCategories[0].category.slug }
        : null,
      stats: {
        likes: _count.likes,
        reviews: _count.reviews,
      },
      raisedAmount,
      topInvestors,
    }
  }

  async updateMilestoneProgress(userId: string, payload: UpdateMilestoneProgressBodyType) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: payload.projectId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
    })

    if (!project) throw ProjectNotFoundException
    if (project.userId !== userId) throw UnauthorizedProjectAccessException

    if (project.status !== PROJECT_STATUS.ACTIVE) {
      throw InvalidProjectStatusException
    }

    const milestone = await this.prisma.milestone.findFirst({
      where: { id: payload.milestoneId, projectId: payload.projectId },
    })
    if (!milestone) throw MilestoneNotFoundException

    return this.prisma.milestoneUpdate.upsert({
      where: { milestoneId: payload.milestoneId },
      create: {
        milestoneId: payload.milestoneId,
        completed: payload.completed || '',
        blockers: payload.notCompleted || '',
        images: payload.images || [],
        demoUrl: payload.video || null,
        link: payload.link || null,
      },
      update: {
        completed: payload.completed || '',
        blockers: payload.notCompleted || '',
        images: payload.images || [],
        demoUrl: payload.video || null,
        link: payload.link || null,
      },
    })
  }
}
