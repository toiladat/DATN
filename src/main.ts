import { NestFactory } from '@nestjs/core'
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

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
