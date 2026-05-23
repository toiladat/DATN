import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { ZodSerializerDto } from 'nestjs-zod'
import { CategoryService } from './category.service'
import { CategoryResponseDTO } from './category.dto'
import { IsPublic } from 'src/shared/decorators/auth.decorator'

@ApiTags('Categories')
@Controller('categories')
@SkipThrottle()
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @IsPublic()
  @ApiResponse({ status: 200, type: CategoryResponseDTO })
  @ZodSerializerDto(CategoryResponseDTO)
  findAll() {
    return this.categoryService.getAll()
  }
}
