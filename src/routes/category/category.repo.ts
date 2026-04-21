import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CategoryType } from './category.model'

@Injectable()
export class CategoryRepo {
  constructor(private prismaService: PrismaService) {}

  async getAll(): Promise<CategoryType[]> {
    return this.prismaService.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  }
}
