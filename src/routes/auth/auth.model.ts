import { UserSchema } from 'src/shared/models/shared-user.model'
import { z } from 'zod'

// ─── Shared Response Schemas ───────────────────────────────────────────────────

export const AuthResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string(),
  })
  .strict()

export const RefreshTokenResSchema = AuthResSchema

export const DeviceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userAgent: z.string(),
  ip: z.string(),
  lastActive: z.date(),
  createdAt: z.date(),
  isActive: z.boolean(),
})

export const RefreshTokenSchema = z.object({
  token: z.string(),
  userId: z.string(),
  deviceId: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
})

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const LogoutBodySchema = RefreshTokenBodySchema

// User response (no sensitive fields)
export const UserResSchema = UserSchema

// ─── Wallet Auth Schemas ───────────────────────────────────────────────────────

const evmAddressRegex = /^0x[0-9a-fA-F]{40}$/

export const GetNonceQuerySchema = z
  .object({
    walletAddress: z.string().regex(evmAddressRegex, 'Invalid EVM wallet address'),
  })
  .strict()

export const GetNonceResSchema = z.object({
  nonce: z.string(),
})

export const WalletLoginBodySchema = z
  .object({
    walletAddress: z.string().regex(evmAddressRegex, 'Invalid EVM wallet address'),
    signature: z.string().min(1),
  })
  .strict()

export const WalletLoginResSchema = AuthResSchema

// ─── TypeScript Types ──────────────────────────────────────────────────────────

export type AuthResType = z.infer<typeof AuthResSchema>
export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>
export type RefreshTokenResType = AuthResType
export type DeviceType = z.infer<typeof DeviceSchema>
export type RoleType = z.infer<typeof RoleSchema>
export type LogoutBodyType = RefreshTokenBodyType

export type GetNonceQueryType = z.infer<typeof GetNonceQuerySchema>
export type GetNonceResType = z.infer<typeof GetNonceResSchema>
export type WalletLoginBodyType = z.infer<typeof WalletLoginBodySchema>
export type WalletLoginResType = z.infer<typeof WalletLoginResSchema>
