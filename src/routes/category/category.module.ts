import { Module } from '@nestjs/common'
import { CategoryController } from './category.controller'
import { CategoryService } from './category.service'
import { CategoryRepo } from './category.repo'

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepo],
  exports: [CategoryService],
})
export class CategoryModule {}
