import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserService } from './user.service'
import { GetAdminUsersQueryDTO, GetAdminUsersResDTO } from './user.dto'
import { AdminAccessTokenGuard } from 'src/shared/guards/admin-access-token.guard'

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth()
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiResponse({ status: 200, type: GetAdminUsersResDTO })
  @ZodSerializerDto(GetAdminUsersResDTO)
  getUsers(@Query() query: GetAdminUsersQueryDTO) {
    return this.userService.getAdminUsers(query)
  }
}
