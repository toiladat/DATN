import { Injectable } from '@nestjs/common'
import { UserRepo } from 'src/routes/user/user.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { SearchUserQueryParamsType } from './user.model'

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
}
