import { Controller, Get, Query, Param, UseGuards, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserService } from './user.service'
import { GetAdminUsersQueryDTO, GetAdminUsersResDTO, GetAdminUserDetailResDTO } from './user.dto'
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

  @Get(':id')
  @ApiResponse({ status: 200, type: GetAdminUserDetailResDTO })
  @ZodSerializerDto(GetAdminUserDetailResDTO)
  getUserDetail(@Param('id') id: string) {
    return this.userService.getAdminUserDetail(id)
  }

  @Patch(':id/ban')
  @ApiResponse({ status: 200 })
  banUser(@Param('id') id: string) {
    return this.userService.banUser(id)
  }

  @Patch(':id/unban')
  @ApiResponse({ status: 200 })
  unbanUser(@Param('id') id: string) {
    return this.userService.unbanUser(id)
  }
}
