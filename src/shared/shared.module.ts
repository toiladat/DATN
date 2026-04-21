import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import Redis from 'ioredis'
import envConfig from './config'
import { AccessTokenGuard } from './guards/access-token.guard'
import { APIKeyGuard } from './guards/api-key.guard'
import { AuthenticationGuard } from './guards/authentication.guard'
import { SharedUserRepository } from './repositories/shared-user.repo'
import { EmailService } from './services/email.service'
import { GenerateIdService } from './services/generate-id.services'
import { HashingService } from './services/hashing.service'
import { PrismaService } from './services/prisma.service'
import { TokenService } from './services/token.service'
import { RedisCacheService } from './services/redis-cache.service'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  SharedUserRepository,
  EmailService,
  GenerateIdService,
  RedisCacheService,
]

@Global() // global mode
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    {
      provide: 'APP_GUARD',
      useClass: AuthenticationGuard,
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(envConfig.REDIS_URL)
      },
    },
  ],
  exports: [...sharedServices, 'REDIS_CLIENT'], // global mode phải có exports
  imports: [JwtModule], //JwtModule là 1module, nên phải imports ở đây
})
export class SharedModule {}
