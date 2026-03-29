import { Injectable } from '@nestjs/common'
import { UserRepo } from 'src/routes/user/user.repo'
import { NotFoundRecordException } from 'src/shared/error'

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepo) {}

  async findById(id: string) {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw NotFoundRecordException
    }
    return user
  }
}
