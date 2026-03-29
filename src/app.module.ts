import KeyvRedis from '@keyv/redis'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { RemoveRefreshTokenCronjob } from './cronjobs/remove-refresh-token.cronjob'
import { AuthModule } from './routes/auth/auth.module'

import { UploadModule } from './routes/upload/upload.module'
import { UserModule } from './routes/user/user.module'
import envConfig from './shared/config'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { ThrottlerBehindProxyGuard } from './shared/guards/throttler-behind-proxy.guard'
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'
import { SharedModule } from './shared/shared.module'
// import { CatchEverythingFilter } from './shared/filters/catch-everything.filter'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        return {
          stores: [new KeyvRedis(envConfig.REDIS_URL)],
          ttl: 60 * 60 * 1000,
        }
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    SharedModule,
    AuthModule,
    UploadModule,
    UserModule,
  ],
  controllers: [],
  providers: [
    {
      //NestJS sẽ áp dụng ZodValidationPipe cho mọi DTO.
      //DTO nào extends từ createZodDto (ví dụ RegisterBodyDTO) sẽ được validate tự động theo schema bạn truyền vào.
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR, // Tất cả controllers đều phải chạy qua ClassSerializerInterceptor, để validate data trước khi response
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER, //bắt và xử lý mọi exception trên toàn ứng dụng, không cần khai báo lại từng chỗ.
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    RemoveRefreshTokenCronjob,
    // {
    //   provide: APP_FILTER,//bắt và xử lý mọi exception trên toàn ứng dụng, lỗi chung chung
    //   useClass: CatchEverythingFilter
    // }
  ],
})
export class AppModule {}
