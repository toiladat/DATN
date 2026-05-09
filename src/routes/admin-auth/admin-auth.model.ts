import { z } from 'zod'

export const AdminLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const AdminAuthResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const AdminRefreshTokenBodySchema = z.object({
  refreshToken: z.string(),
})

export const AdminLogoutBodySchema = AdminRefreshTokenBodySchema

export type AdminLoginBodyType = z.infer<typeof AdminLoginBodySchema>
export type AdminAuthResType = z.infer<typeof AdminAuthResSchema>
export type AdminRefreshTokenBodyType = z.infer<typeof AdminRefreshTokenBodySchema>
export type AdminLogoutBodyType = z.infer<typeof AdminLogoutBodySchema>
