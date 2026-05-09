import { Module } from '@nestjs/common'
import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'
import { AdminAuthRepository } from './admin-auth.repo'

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthRepository],
})
export class AdminAuthModule {}
