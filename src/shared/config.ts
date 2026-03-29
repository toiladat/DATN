import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

config({
  path: '.env',
})

const isDev = process.env.NODE_ENV !== 'production'

// ✅ DEV: cho phép dùng file .env
if (isDev) {
  if (!fs.existsSync(path.resolve('.env'))) {
    console.warn('⚠️  DEV mode: không tìm thấy .env (bỏ qua)')
  }
}

// ✅ PROD: KHÔNG check file .env
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is missing')
}

const conifgSchema = z.object({
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  SECERET_API_KEY: z.string(),

  ADMIN_NAME: z.string(),
  ADMIN_PASSWORD: z.string(),
  ADMIN_EMAIL: z.string(),
  ADMIN_PHONE: z.string(),

  OTP_EXPIRES_IN: z.string(),
  RESEND_API_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECERET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_CLIENT_REDIRECT_URI: z.string(),

  ORIGINS: z.string(),

  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_URL: z.string(),

  REDIS_URL: z.string(),
})

const configServer = conifgSchema.safeParse(process.env)

if (!configServer.success) {
  console.log('Cac gia tri trong .env khong hop le')
  console.error(configServer.error)
  process.exit(1)
}

const envConfig = configServer.data
export default envConfig
