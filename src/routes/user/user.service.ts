import { Injectable } from '@nestjs/common'
import { UserRepo } from 'src/routes/user/user.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { GetAdminUsersQueryType, SearchUserQueryParamsType, UpdateUserProfileType } from './user.model'

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepo) {}

  async findById(id: string) {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw NotFoundRecordException
    }
    return user
  }

  async search(query: SearchUserQueryParamsType) {
    return { users: await this.userRepo.search(query) }
  }

  async updateProfile(userId: string, body: UpdateUserProfileType) {
    const user = await this.userRepo.updateProfile(userId, body)
    return user
  }

  async getAdminUsers(query: GetAdminUsersQueryType) {
    const result = await this.userRepo.findAdminUsers(query)
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: Math.ceil(result.total / result.limit) || 1,
    }
  }
}
