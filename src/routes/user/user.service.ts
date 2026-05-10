import { Injectable } from '@nestjs/common'
import { UserRepo } from 'src/routes/user/user.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { GetAdminUsersQueryType, SearchUserQueryParamsType, UpdateUserProfileType } from './user.model'

import { EmailService } from 'src/shared/services/email.service'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly emailService: EmailService,
  ) {}

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

  async getAdminUserDetail(id: string) {
    try {
      return await this.userRepo.getAdminUserDetail(id)
    } catch (error) {
      if (error.message === 'User not found') {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async banUser(id: string) {
    const user = await this.userRepo.banUser(id)

    // Send email notification in the background if email exists
    if (user.email) {
      this.emailService
        .sendBanNotification({
          email: user.email,
          name: user.name || 'User',
        })
        .catch(() => {})
    }

    return { success: true, message: 'User banned successfully' }
  }

  async unbanUser(id: string) {
    await this.userRepo.unbanUser(id)
    return { success: true, message: 'User unbanned successfully' }
  }
}
