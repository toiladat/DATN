import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger' // <--- Import thêm cái này
import { SkipThrottle } from '@nestjs/throttler'
import { ZodSerializerDto } from 'nestjs-zod'
import { UserService } from 'src/routes/user/user.service'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'
import { GetUserProfileResDTO } from 'src/shared/dtos/shared-user.dto'
import { GetUserParamsDTO, SearchUserQueryDTO, SearchUserQueryResDTO } from './user.dto'
@ApiTags('Users')
@Controller('users')
@SkipThrottle()
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiResponse({ status: 200, type: GetUserProfileResDTO })
  @ZodSerializerDto(GetUserProfileResDTO)
  findMe(@ActivateUser('userId') userId: string) {
    return this.userService.findById(userId)
  }

  @Get('search')
  @ApiResponse({ status: 200, type: SearchUserQueryResDTO })
  @ZodSerializerDto(SearchUserQueryResDTO)
  search(@Query() query: SearchUserQueryDTO) {
    return this.userService.search(query)
  }

  @Get(':userId')
  @ApiResponse({ status: 200, type: GetUserProfileResDTO })
  @ZodSerializerDto(GetUserParamsDTO)
  findById(@Param() params: GetUserParamsDTO) {
    return this.userService.findById(params.userId)
  }
}
