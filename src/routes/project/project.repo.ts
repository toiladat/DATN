import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateProjectBodyType, CreateProjectRestType } from './project.model'
import { generateSlug } from 'src/shared/helpers'
import { ethers } from 'ethers'
import envConfig from 'src/shared/config'
import {
  INVESTMENT_STATUS,
  PROJECT_STATUS,
  DEFAULT_CATEGORY_NAME,
  MILESTONE_STATUS,
  PROJECT_SORT,
  WITHDRAWAL_STATUS,
  ProjectSortType,
} from 'src/shared/constants/project.constant'
import {
  ProjectNotFoundException,
  UnauthorizedProjectAccessException,
  InvalidProjectStatusException,
  MilestoneNotFoundException,
  MilestoneNotUnlockedException,
  MilestoneAlreadyFinalizedException,
  ProjectNotRefundableException,
  NoInvestmentsToRefundException,
  BlockchainTxPendingOrFailedException,
  BlockchainVerificationException,
  ReviewNotFoundException,
  UnauthorizedReviewAccessException,
  BlockchainCancelProjectException,
} from './project.error'
import { UpdateMilestoneProgressBodyType } from './project.model'
@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(ownerId: string, data: CreateProjectBodyType): Promise<CreateProjectRestType> {
    const projectSlug = generateSlug(data.basics.title)
    console.log('Project repo createProject attachments:', JSON.stringify(data.attachments, null, 2))
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
            description: m.roleDescription || '',
          })),
        })
      }

      // 4. Create Project Attachments
      if (data.attachments && data.attachments.length > 0) {
        await tx.projectAttachment.createMany({
          data: data.attachments.map((a) => ({
            projectId: project.id,
            url: a.url,
            category: a.category,
            customCategoryName: a.customCategoryName || null,
            description: a.description || null,
          })),
        })
      }

      return { id: project.id }
    })
  }

  async approveProject(projectId: string) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: PROJECT_STATUS.APPROVED },
      include: { user: true },
    })
  }

  async getPendingProjects() {
    const projects = await this.prisma.project.findMany({
      where: {
        status: PROJECT_STATUS.PENDING,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            walletAddress: true,
            phoneNumber: true,
            location: true,
          },
        },
        milestones: { select: { id: true } },
        projectCategories: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        image: p.images[0] || null,
        status: 'pending',
        fundingGoal: p.totalAmount,
        raisedAmount: p.raisedAmount,
        primaryCategory: p.projectCategories[0]?.category?.name,
        startDate: p.startDate.getTime(),
        endDate: p.endDate.getTime(),
        createdAt: p.createdAt.getTime(),
        totalMilestones: p.milestones.length,
        user: {
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          avatar: p.user.avatar,
          walletAddress: p.user.walletAddress,
          phoneNumber: (p.user as any).phoneNumber ?? null,
          location: (p.user as any).location ?? null,
        },
      })),
    }
  }

  async rejectProject(projectId: string, reason: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } })
    if (project && (project.status === PROJECT_STATUS.PROGRESS || project.status === PROJECT_STATUS.ACTIVE)) {
      try {
        const provider = new ethers.JsonRpcProvider(envConfig.PROVIDER_URL)
        const wallet = new ethers.Wallet(envConfig.ADMIN_PRIVATE_KEY, provider)
        const contractAbi = ['function adminCancelProject(uint256 _projectId) external']
        const contract = new ethers.Contract(envConfig.CROWDFUNDING_ADDRESS, contractAbi, wallet)

        // 1. Gửi transaction lên blockchain mempool (mất < 500ms)
        const tx = await contract.adminCancelProject(BigInt('0x' + projectId))

        // 2. Chạy luồng chờ đợi xác nhận blockchain chạy ngầm
        tx.wait()
          .then(async (receipt: any) => {
            if (receipt && receipt.status === 1) {
              await this.prisma.project.update({
                where: { id: projectId },
                data: { status: PROJECT_STATUS.FAILED, rejectReason: reason },
              })
              console.log(`[rejectProject] Blockchain cancel confirmed. Project ${projectId} marked FAILED in DB.`)
            } else {
              console.error(`[rejectProject] Blockchain cancel transaction reverted for project ${projectId}`)
            }
          })
          .catch((err: any) => {
            console.error(
              `[rejectProject] Error waiting for blockchain cancellation of project ${projectId}:`,
              err.message,
            )
          })
      } catch (e) {
        console.error('Failed to initiate reject on blockchain:', e)
        throw BlockchainCancelProjectException
      }

      return {
        ...project,
        status: PROJECT_STATUS.FAILED,
        rejectReason: reason,
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: PROJECT_STATUS.FAILED, rejectReason: reason },
      include: { user: true },
    })
  }

  // ─── ADMIN MILESTONES ────────────────────────────────────────────────────────

  async getPendingMilestones() {
    // Tìm các Milestone N đang chờ duyệt (status: PROGRESS) và order > 1
    const pendingMilestones = await this.prisma.milestone.findMany({
      where: {
        status: MILESTONE_STATUS.PROGRESS,
        order: { gt: 1 },
        project: { status: PROJECT_STATUS.ACTIVE },
      },
      include: {
        project: {
          select: { id: true, title: true, slug: true, images: true, user: { select: { name: true, avatar: true } } },
        },
      },
      orderBy: { endDate: 'asc' },
    })

    // Lấy báo cáo của giai đoạn liền trước (N-1)
    const result = await Promise.all(
      pendingMilestones.map(async (milestone) => {
        const prevMilestone = await this.prisma.milestone.findFirst({
          where: {
            projectId: milestone.projectId,
            order: milestone.order - 1,
          },
          include: {
            milestoneUpdates: true,
          },
        })

        return {
          ...milestone,
          previousMilestone: prevMilestone,
        }
      }),
    )

    return result
  }

  async approveMilestone(milestoneId: string) {
    return this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MILESTONE_STATUS.APPROVED },
      include: { project: { include: { user: true } } },
    })
  }

  async getMilestoneById(milestoneId: string) {
    return this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    })
  }

  async rejectMilestone(milestoneId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.update({
        where: { id: milestoneId },
        data: { status: MILESTONE_STATUS.CANCELLED },
        include: { project: { include: { user: true } } },
      })
      await tx.project.update({
        where: { id: milestone.projectId },
        data: { status: PROJECT_STATUS.FAILED, rejectReason: reason },
      })

      return milestone
    })
  }

  async submitLaunchTx(projectIdOrSlug: string, txHash: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    let targetProjectId = projectIdOrSlug
    if (!isObjectId) {
      const project = await this.prisma.project.findFirst({
        where: { slug: projectIdOrSlug },
        select: { id: true },
      })
      if (!project) throw ProjectNotFoundException
      targetProjectId = project.id
    }

    return this.prisma.project.update({
      where: { id: targetProjectId },
      data: { launchTxHash: txHash },
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
        const completedMilestones = p.milestones.filter(
          (m) => m.status === MILESTONE_STATUS.COMPLETED || m.status === MILESTONE_STATUS.WITHDRAWN,
        ).length

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

  async getMyInvestedProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        investments: {
          some: {
            userId: userId,
            status: INVESTMENT_STATUS.SUCCESS, // only count successful investments
          },
        },
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

        // Calculate myInvestmentAmount and investedAt for the specific user
        const userInvestments = p.investments.filter(
          (inv) =>
            inv.userId === userId &&
            (inv.status === INVESTMENT_STATUS.SUCCESS || inv.status === INVESTMENT_STATUS.REFUNDED),
        )
        const myInvestmentAmount = userInvestments.reduce((sum, inv) => sum + inv.amount, 0)

        // Check if user has already refunded
        const hasRefunded = userInvestments.some((inv) => inv.status === INVESTMENT_STATUS.REFUNDED)

        // Lấy thời điểm đầu tư mới nhất hoặc cũ nhất (tuỳ chọn, ở đây lấy mới nhất)
        const latestInvestment = userInvestments.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]
        const investedAt = latestInvestment ? new Date(latestInvestment.createdAt).getTime() : 0

        let mappedStatus = 'pending'
        if (p.status === PROJECT_STATUS.PROGRESS) mappedStatus = 'progress'
        else if (p.status === PROJECT_STATUS.ACTIVE) mappedStatus = 'active'
        else if (p.status === PROJECT_STATUS.SUCCESS) mappedStatus = 'success'
        else if (p.status === PROJECT_STATUS.FAILED || p.status === PROJECT_STATUS.EXPIRED) mappedStatus = 'rejected'

        const primaryCat = p.projectCategories[0]?.category?.name || DEFAULT_CATEGORY_NAME

        const totalMilestones = p.milestones.length
        const withdrawnMilestonesAmount = p.milestones
          .filter((m) => m.status === MILESTONE_STATUS.WITHDRAWN)
          .reduce((sum, m) => sum + m.amount, 0)
        const remainingBalance = Math.max(0, raisedAmount - withdrawnMilestonesAmount)
        const calculatedRefund = raisedAmount > 0 ? (myInvestmentAmount * remainingBalance) / raisedAmount : 0
        const refundAmount = Math.round(calculatedRefund * 10) / 10

        const completedMilestones = p.milestones.filter(
          (m) => m.status === MILESTONE_STATUS.COMPLETED || m.status === MILESTONE_STATUS.WITHDRAWN,
        ).length

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
          myInvestmentAmount,
          refundAmount,
          investedAt,
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
          hasRefunded,
          rejectReason: p.rejectReason || undefined,
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
        in: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.PROGRESS, PROJECT_STATUS.SUCCESS],
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
        const completedMilestones = p.milestones.filter(
          (m) => m.status === MILESTONE_STATUS.COMPLETED || m.status === MILESTONE_STATUS.WITHDRAWN,
        ).length

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

  async deleteProject(idOrSlug: string, userId: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug)
    const project = await this.prisma.project.findFirst({
      where: {
        ...(isObjectId ? { id: idOrSlug } : { slug: idOrSlug }),
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
      where: { id: project.id },
      data: { deletedAt: new Date() },
    })
  }

  async getProjectById(idOrSlug: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug)
    const project = await this.prisma.project.findFirst({
      where: {
        ...(isObjectId ? { id: idOrSlug } : { slug: idOrSlug }),
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true, walletAddress: true },
        },
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
        projectAttachments: true,
      },
    })

    if (!project) throw ProjectNotFoundException

    const { projectCategories, _count, investments, ...rest } = project

    const successfulInvestments = investments.filter((inv) => inv.status === INVESTMENT_STATUS.SUCCESS)

    const topInvestors = [...successfulInvestments]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((inv) => ({
        amount: inv.amount,
        name: inv.user?.name,
        avatar: inv.user?.avatar,
        content: inv.content,
        createdAt: inv.createdAt,
      }))

    const recentInvestors = [...successfulInvestments]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((inv) => ({
        amount: inv.amount,
        name: inv.user?.name,
        avatar: inv.user?.avatar,
        content: inv.content,
        createdAt: inv.createdAt,
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
      recentInvestors,
    }
  }

  async processRefund(userId: string, projectIdOrSlug: string, txHash: string) {
    // 1. Verify the project status
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    const project = await this.prisma.project.findFirst({
      where: {
        ...(isObjectId ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
      },
      select: { id: true, status: true },
    })

    if (!project || (project.status !== PROJECT_STATUS.FAILED && project.status !== PROJECT_STATUS.EXPIRED)) {
      throw ProjectNotRefundableException
    }

    // 2. Fetch the user's SUCCESS investments in this project
    const investments = await this.prisma.investment.findMany({
      where: {
        userId,
        projectId: project.id,
        status: INVESTMENT_STATUS.SUCCESS,
      },
    })

    if (investments.length === 0) {
      throw NoInvestmentsToRefundException
    }

    // 3. Verify on blockchain
    let receipt: any
    try {
      const provider = new ethers.JsonRpcProvider(envConfig.PROVIDER_URL)
      receipt = await provider.getTransactionReceipt(txHash)
    } catch (e: any) {
      throw new BlockchainVerificationException(e.message)
    }

    if (!receipt || receipt.status !== 1) {
      throw BlockchainTxPendingOrFailedException
    }

    // 4. Update them to REFUNDED
    await this.prisma.investment.updateMany({
      where: {
        id: { in: investments.map((inv) => inv.id) },
      },
      data: {
        status: INVESTMENT_STATUS.REFUNDED,
      },
    })

    return { success: true }
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
    const TERMINAL_STATUSES = [MILESTONE_STATUS.CANCELLED]
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
    const DONE_STATUSES = [MILESTONE_STATUS.COMPLETED, MILESTONE_STATUS.APPROVED, MILESTONE_STATUS.WITHDRAWN]

    if (target.order > 1) {
      const prev = allMilestones.find((m) => m.order === target.order - 1)
      if (!prev || !DONE_STATUSES.includes(prev.status as any)) {
        throw MilestoneNotUnlockedException
      }
    }

    // If the NEXT milestone is already APPROVED or WITHDRAWN, this milestone is finalized
    const next = allMilestones.find((m) => m.order === target.order + 1)
    if (next && DONE_STATUSES.includes(next.status as any)) {
      throw MilestoneAlreadyFinalizedException
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

  async createInvestment(projectIdOrSlug: string, userId: string, amount: number, txHash: string, content?: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    const project = await this.prisma.project.findFirst({
      where: {
        ...(isObjectId ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
    })
    if (!project) throw ProjectNotFoundException

    return this.prisma.investment.create({
      data: {
        projectId: project.id,
        userId,
        amount,
        txHash,
        content: content || null,
        status: INVESTMENT_STATUS.PENDING,
      },
    })
  }

  async updateInvestmentStatus(txHash: string, status: 'SUCCESS' | 'FAILED') {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { txHash },
      })

      if (!investment) return null
      if (investment.status !== INVESTMENT_STATUS.PENDING) return investment

      // Cập nhật trạng thái Investment
      const updatedInvestment = await tx.investment.update({
        where: { id: investment.id },
        data: { status },
      })

      // Nếu giao dịch thành công, cập nhật raisedAmount cho Project
      if (status === INVESTMENT_STATUS.SUCCESS) {
        const project = await tx.project.update({
          where: { id: investment.projectId },
          data: {
            raisedAmount: { increment: investment.amount },
          },
          select: { raisedAmount: true, totalAmount: true },
        })

        // Chuyển trạng thái sang ACTIVE nếu đã đủ vốn
        // Dùng sai số nhỏ để tránh lỗi Float precision của MongoDB/Prisma
        if (project.raisedAmount >= project.totalAmount - 0.000001) {
          await tx.project.update({
            where: { id: investment.projectId },
            data: { status: PROJECT_STATUS.ACTIVE },
          })

          // Tự động Approve Milestone 1 để Founder rút tiền khởi động
          await tx.milestone.updateMany({
            where: { projectId: investment.projectId, order: 1 },
            data: { status: MILESTONE_STATUS.APPROVED },
          })
        }
      }

      return updatedInvestment
    })
  }

  async likeProject(projectIdOrSlug: string, userId: string) {
    let targetProjectId = projectIdOrSlug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    if (!isObjectId) {
      const project = await this.prisma.project.findFirst({
        where: { slug: projectIdOrSlug },
        select: { id: true },
      })
      if (!project) throw ProjectNotFoundException
      targetProjectId = project.id
    }

    const existingLike = await this.prisma.like.findUnique({
      where: {
        projectId_userId: { projectId: targetProjectId, userId },
      },
    })
    if (!existingLike) {
      await this.prisma.like.create({
        data: { projectId: targetProjectId, userId },
      })
    }
  }

  async unlikeProject(projectIdOrSlug: string, userId: string) {
    let targetProjectId = projectIdOrSlug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    if (!isObjectId) {
      const project = await this.prisma.project.findFirst({
        where: { slug: projectIdOrSlug },
        select: { id: true },
      })
      if (!project) return
      targetProjectId = project.id
    }

    await this.prisma.like.deleteMany({
      where: { projectId: targetProjectId, userId },
    })
  }

  async getReviews(projectIdOrSlug: string) {
    let targetProjectId = projectIdOrSlug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    if (!isObjectId) {
      const project = await this.prisma.project.findFirst({
        where: { slug: projectIdOrSlug },
        select: { id: true },
      })
      if (!project) return []
      targetProjectId = project.id
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        projectId: targetProjectId,
        // In MongoDB, parentId can be null OR absent (field not set at all)
        // Prisma `{ parentId: null }` only matches explicit null, not missing fields
        OR: [{ parentId: null }, { parentId: { isSet: false } }],
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, walletAddress: true },
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, walletAddress: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.getTime(),
      replies: r.replies.map((reply: any) => ({
        ...reply,
        createdAt: reply.createdAt.getTime(),
      })),
    }))
  }

  async createReview(userId: string, projectIdOrSlug: string, content: string, parentId?: string) {
    let targetProjectId = projectIdOrSlug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    if (!isObjectId) {
      const project = await this.prisma.project.findFirst({
        where: { slug: projectIdOrSlug },
        select: { id: true },
      })
      if (!project) throw ProjectNotFoundException
      targetProjectId = project.id
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        projectId: targetProjectId,
        content,
        // Normalize to null (not undefined) so Prisma/MongoDB stores explicit null
        // This prevents the "absent field" vs null mismatch in future queries
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, walletAddress: true } },
      },
    })
    return { ...review, createdAt: review.createdAt.getTime(), replies: [] }
  }

  async updateReview(userId: string, reviewId: string, content: string) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId } })
    if (!review) throw ReviewNotFoundException
    if (review.userId !== userId) throw UnauthorizedReviewAccessException

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { content },
    })
    return { ...updated, createdAt: updated.createdAt.getTime() }
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId } })
    if (!review) throw ReviewNotFoundException
    if (review.userId !== userId) throw UnauthorizedReviewAccessException

    // Cascade delete replies first
    await this.prisma.review.deleteMany({
      where: { parentId: reviewId },
    })

    return this.prisma.review.delete({
      where: { id: reviewId },
    })
  }

  // ─── QUERY HELPERS FOR SERVICE VALIDATIONS ───────────────────────────────────

  async getProjectForOwner(projectIdOrSlug: string, userId: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrSlug)
    return this.prisma.project.findFirst({
      where: {
        ...(isObjectId ? { id: projectIdOrSlug } : { slug: projectIdOrSlug }),
        userId,
        OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
      },
    })
  }

  async getMilestoneForProject(milestoneId: string, projectId: string) {
    return this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
      include: { withdrawalRecord: true },
    })
  }

  async getWithdrawalRecordByTx(txHash: string) {
    return this.prisma.withdrawalRecord.findUnique({
      where: { txHash },
    })
  }

  // ─── WITHDRAWAL ───────────────────────────────────────────────────────────────

  async submitWithdrawMilestone(milestoneId: string, projectId: string, txHash: string, amount: number) {
    return this.prisma.withdrawalRecord.create({
      data: {
        milestoneId,
        projectId,
        txHash,
        amount,
        status: WITHDRAWAL_STATUS.PENDING,
      },
    })
  }

  async updateWithdrawalStatus(txHash: string, status: 'SUCCESS' | 'FAILED') {
    return this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRecord.findUnique({
        where: { txHash },
      })

      if (!withdrawal) return null
      if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING) return withdrawal

      // Cập nhật WithdrawalRecord
      const updated = await tx.withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: { status },
      })

      // Nếu SUCCESS → set Milestone.status = WITHDRAWN
      if (status === WITHDRAWAL_STATUS.SUCCESS) {
        await tx.milestone.update({
          where: { id: withdrawal.milestoneId },
          data: { status: MILESTONE_STATUS.WITHDRAWN },
        })

        // Kiểm tra xem tất cả các milestones của project này đã được WITHDRAWN chưa
        const projectId = withdrawal.projectId
        const totalMilestones = await tx.milestone.count({
          where: { projectId },
        })

        const withdrawnMilestones = await tx.milestone.count({
          where: {
            projectId,
            status: MILESTONE_STATUS.WITHDRAWN,
          },
        })

        // Nếu số lượng milestone đã rút (WITHDRAWN) bằng tổng số lượng milestone, dự án chuyển sang trạng thái SUCCESS
        if (totalMilestones > 0 && withdrawnMilestones === totalMilestones) {
          await tx.project.update({
            where: { id: projectId },
            data: { status: PROJECT_STATUS.SUCCESS },
          })
          console.log(
            `[ProjectRepository] Project ${projectId} has successfully completed all milestones -> Status updated to SUCCESS`,
          )
        }
      }

      return updated
    })
  }

  async getProjectStats() {
    const [total, fundraising, active, success] = await Promise.all([
      this.prisma.project.count({
        where: {
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),
      this.prisma.project.count({
        where: {
          status: PROJECT_STATUS.PROGRESS,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),
      this.prisma.project.count({
        where: {
          status: PROJECT_STATUS.ACTIVE,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),
      this.prisma.project.count({
        where: {
          status: PROJECT_STATUS.SUCCESS,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      }),
    ])
    return { total, fundraising, active, success }
  }
}
