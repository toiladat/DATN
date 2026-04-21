import { Injectable } from '@nestjs/common'
import { CategoryRepo } from './category.repo'
import { CategoryResponseType } from './category.model'
import { RedisCacheService } from 'src/shared/services/redis-cache.service'

@Injectable()
export class CategoryService {
  constructor(
    private categoryRepo: CategoryRepo,
    private redisCacheService: RedisCacheService,
  ) {}

  async getAll(): Promise<CategoryResponseType> {
    // const categories = await this.redisCacheService.getOrSet(
    //   CACHE_KEYS.CATEGORIES_ALL,
    //   () => this.categoryRepo.getAll(),
    //   1000 * 60 * 5 // 5 minutes TTL
    // )
    const categories = await this.categoryRepo.getAll()
    return { categories }
  }
}
