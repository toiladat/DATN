import { z } from 'zod'
import { UserStatus } from '../constants/auth.constant'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().min(2).max(100),

  name: z.string().min(1).max(20),
  phoneNumber: z.string().optional().nullable(),
  avatar: z.string().nullable(),
  roleId: z.string(),
  status: z.nativeEnum(UserStatus),
  totpSecret: z.string().nullable(),
  deletedAt: z.date().nullable().optional(),
  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
})

export const UserUpdateSchema = UserSchema.omit({
  id: true,
  roleId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
})

export const UserProfileSchema = UserSchema.omit({
  password: true,
  roleId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  totpSecret: true,
  status: true,
})

export type UserType = z.infer<typeof UserSchema>
export type UserUpdateType = z.infer<typeof UserUpdateSchema>
export type UserProfileType = z.infer<typeof UserProfileSchema>
