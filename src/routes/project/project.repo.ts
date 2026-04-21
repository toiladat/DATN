import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateProjectBodyType, CreateProjectRestType } from './project.model'
import { generateSlug } from 'src/shared/helpers'

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
}
