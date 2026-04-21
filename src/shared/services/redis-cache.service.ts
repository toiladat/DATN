import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { Cache } from 'cache-manager'

@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null | undefined> {
    return this.cacheManager.get<T>(key)
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl)
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key)
  }

  /**
   * Fetches data from cache, or executes the fetcher block if miss, caching it afterwards.
   * @param key Redis Cache Key
   * @param fetcher Async function retrieving fresh data
   * @param ttl Time To Live in milliseconds. Default 1 day.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = 1000 * 60 * 60 * 24): Promise<T> {
    const cachedData = await this.get<T>(key)
    if (cachedData) {
      return cachedData
    }

    const freshData = await fetcher()
    if (freshData) {
      await this.set(key, freshData, ttl)
    }

    return freshData
  }
}
