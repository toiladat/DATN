import { z } from 'zod'
import { UserStatus } from '@prisma/client'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional().nullable(),
  name: z.string().nullable(),
  phoneNumber: z.string().optional().nullable(),
  avatar: z.string().nullable(),
  roleId: z.string(),
  status: z.nativeEnum(UserStatus),
  walletAddress: z.string(),
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
  roleId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  status: true,
})

export type UserType = z.infer<typeof UserSchema>
export type UserUpdateType = z.infer<typeof UserUpdateSchema>
export type UserProfileType = z.infer<typeof UserProfileSchema>
