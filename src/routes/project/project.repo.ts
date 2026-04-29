import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateProjectBodyType, CreateProjectRestType } from './project.model'
import { generateSlug } from 'src/shared/helpers'
import {
  INVESTMENT_STATUS,
  PROJECT_STATUS,
  DEFAULT_CATEGORY_NAME,
  MILESTONE_STATUS,
  PROJECT_SORT,
  ProjectSortType,
} from 'src/shared/constants/project.constant'
import {
  ProjectNotFoundException,
  UnauthorizedProjectAccessException,
  InvalidProjectStatusException,
  MilestoneNotFoundException,
  MilestoneNotUnlockedException,
  MilestoneAlreadyFinalizedException,
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
        investments: {
          include: { user: { select: { avatar: true } } },
        },
        milestones: true,
        likes: true,
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

        const avatars = new Set<string>()
        p.investments.forEach((inv: any) => {
          if (inv.user?.avatar) avatars.add(inv.user.avatar)
        })
        const topInvestorsAvatars = Array.from(avatars).slice(0, 3)

        return {
          id: p.id,
          title: p.title,
          description: p.subtitle,
          status: mappedStatus,
          fundingGoal: p.totalAmount,
          raisedAmount,
          image: p.images[0] || null,
          primaryCategory: primaryCat,
          investorsCount: p.investments.length,
          topInvestorsAvatars,
          likesCount: p.likes.length,
          isLiked: p.likes.some((l) => l.userId === userId),
          startDate: p.startDate.getTime(),
          endDate: p.endDate.getTime(),
          updatedAt: p.updatedAt.getTime(),
          totalMilestones,
          completedMilestones,
        }
      }),
    }
  }

  async getAllProjects(
    page: number,
    limit: number,
    search?: string,
    categorySlug?: string,
    sort: ProjectSortType = PROJECT_SORT.NEWEST,
    userId?: string,
  ) {
    const whereCondition = {
      status: {
        in: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.PROGRESS],
      },
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      ...(search?.trim() ? { title: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
      ...(categorySlug
        ? {
            projectCategories: {
              some: {
                category: { slug: categorySlug },
              },
            },
          }
        : {}),
    }

    const orderBy =
      sort === PROJECT_SORT.MOST_FUNDED
        ? { raisedAmount: 'desc' as const }
        : sort === PROJECT_SORT.TRENDING
          ? { investments: { _count: 'desc' as const } }
          : { createdAt: 'desc' as const } // NEWEST (default)

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where: whereCondition }),
      this.prisma.project.findMany({
        where: whereCondition,
        include: {
          investments: {
            include: {
              user: {
                select: { avatar: true },
              },
            },
          },
          milestones: true,
          likes: true,
          projectCategories: {
            include: { category: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return {
      projects: projects.map((p) => {
        let mappedStatus = 'pending'
        if (p.status === PROJECT_STATUS.PROGRESS) mappedStatus = 'progress'
        else if (p.status === PROJECT_STATUS.ACTIVE) mappedStatus = 'active'
        else if (p.status === PROJECT_STATUS.SUCCESS) mappedStatus = 'success'
        else if (p.status === PROJECT_STATUS.FAILED || p.status === PROJECT_STATUS.EXPIRED) mappedStatus = 'rejected'

        const primaryCat = p.projectCategories[0]?.category?.name || DEFAULT_CATEGORY_NAME

        const totalMilestones = p.milestones.length
        const completedMilestones = p.milestones.filter((m) => m.status === MILESTONE_STATUS.COMPLETED).length

        const avatars = new Set<string>()
        p.investments.forEach((inv: any) => {
          if (inv.user?.avatar) avatars.add(inv.user.avatar)
        })
        const topInvestorsAvatars = Array.from(avatars).slice(0, 3)

        return {
          id: p.id,
          title: p.title,
          description: p.subtitle,
          status: mappedStatus,
          fundingGoal: p.totalAmount,
          raisedAmount: p.raisedAmount,
          image: p.images[0] || null,
          primaryCategory: primaryCat,
          investorsCount: p.investments.length,
          topInvestorsAvatars,
          likesCount: p.likes.length,
          isLiked: userId ? p.likes.some((l) => l.userId === userId) : false,
          startDate: p.startDate.getTime(),
          endDate: p.endDate.getTime(),
          updatedAt: p.updatedAt.getTime(),
          totalMilestones,
          completedMilestones,
        }
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    const topInvestors = [...investments]
      .filter((inv) => inv.status === INVESTMENT_STATUS.SUCCESS) // Consider only successful
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((inv) => ({
        amount: inv.amount,
        name: inv.user?.name,
        avatar: inv.user?.avatar,
      }))

    const STATUS_MAP: Record<string, string> = {
      [PROJECT_STATUS.PENDING]: 'pending',
      [PROJECT_STATUS.PROGRESS]: 'progress',
      [PROJECT_STATUS.ACTIVE]: 'active',
      [PROJECT_STATUS.SUCCESS]: 'success',
      [PROJECT_STATUS.FAILED]: 'rejected',
      [PROJECT_STATUS.EXPIRED]: 'rejected',
    }

    return {
      ...rest,
      status: STATUS_MAP[rest.status] ?? rest.status.toLowerCase(),
      category: projectCategories[0]?.category
        ? { name: projectCategories[0].category.name, slug: projectCategories[0].category.slug }
        : null,
      stats: {
        likes: _count.likes,
        reviews: _count.reviews,
      },
      topInvestors,
    }
  }

  private async assertMilestoneUpdateEligible(projectId: string, milestoneId: string): Promise<{ isLate: boolean }> {
    const allMilestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, status: true, startDate: true, endDate: true },
    })

    const target = allMilestones.find((m) => m.id === milestoneId)
    if (!target) throw MilestoneNotFoundException

    // Terminal status check: Cannot update if already finalized
    const TERMINAL_STATUSES = [
      MILESTONE_STATUS.COMPLETED,
      MILESTONE_STATUS.APPROVED,
      MILESTONE_STATUS.CANCELLED,
      MILESTONE_STATUS.WITHDRAWN,
    ]
    if (TERMINAL_STATUSES.includes(target.status as any)) {
      throw MilestoneAlreadyFinalizedException
    }

    // Date window: today must be >= milestone startDate (date-only, no time component)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDay = new Date(target.startDate)
    startDay.setHours(0, 0, 0, 0)
    if (today < startDay) throw MilestoneNotUnlockedException

    // Sequential prerequisite: milestone 1 has no dependency
    // Order is always 1-n, so previous milestone is order - 1
    if (target.order > 1) {
      const prev = allMilestones.find((m) => m.order === target.order - 1)
      const DONE_STATUSES = [MILESTONE_STATUS.COMPLETED, MILESTONE_STATUS.APPROVED]
      if (!prev || !DONE_STATUSES.includes(prev.status as any)) {
        throw MilestoneNotUnlockedException
      }
    }

    // Determine if this is a late update (after endDate)
    const endDay = new Date(target.endDate)
    endDay.setHours(23, 59, 59, 999)
    const isLate = today > endDay

    return { isLate }
  }

  async updateMilestoneProgress(userId: string, payload: UpdateMilestoneProgressBodyType) {
    const project = await this.prisma.project.findFirst({
      where: {
        userId,
        id: payload.projectId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
    })

    if (!project) throw ProjectNotFoundException

    if (project.status !== PROJECT_STATUS.ACTIVE) {
      throw InvalidProjectStatusException
    }

    const { isLate } = await this.assertMilestoneUpdateEligible(payload.projectId, payload.milestoneId)

    return this.prisma.milestoneUpdate.upsert({
      where: { milestoneId: payload.milestoneId },
      create: {
        milestoneId: payload.milestoneId,
        completed: payload.completed,
        blockers: payload.blockers,
        images: payload.images,
        video: payload.video ?? '',
        link: payload.link ?? null,
        isLate,
      },
      update: {
        completed: payload.completed,
        blockers: payload.blockers,
        images: payload.images,
        video: payload.video ?? '',
        link: payload.link ?? null,
        isLate,
      },
    })
  }
  async likeProject(projectId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    })
    if (!existingLike) {
      await this.prisma.like.create({
        data: { projectId, userId },
      })
    }
  }

  async unlikeProject(projectId: string, userId: string) {
    await this.prisma.like.deleteMany({
      where: { projectId, userId },
    })
  }
}
