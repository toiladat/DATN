import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { patchNestJsSwagger } from 'nestjs-zod'
import { AppModule } from './app.module'
import envConfig from './shared/config'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
  app.set('trust proxy', 'loopback') // Trust requests from the loopback address

  app.enableShutdownHooks()

  const corsOrigins = envConfig.ORIGINS?.split(',').map((origin) => origin.trim()) || []
  //cors
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })

  app.use(helmet())
  patchNestJsSwagger()
  const config = new DocumentBuilder()
    .setTitle('Truyen Ai')
    .setDescription('The API for the Truyen Ai ')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({
      name: 'authorization',
      type: 'apiKey',
    })
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('/api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  // HTTP request logger middleware
  const logger = new Logger('HTTP')
  app.use((req: any, res: any, next: any) => {
    const { method, originalUrl } = req
    const start = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - start
      const { statusCode } = res
      const color = statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m'
      logger.log(`${color}${method}\x1b[0m ${originalUrl} → ${color}${statusCode}\x1b[0m (${duration}ms)`)
    })
    next()
  })

  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
