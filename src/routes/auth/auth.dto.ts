import { createZodDto } from 'nestjs-zod'
import {
  GetNonceQuerySchema,
  GetNonceResSchema,
  LogoutBodySchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  UserResSchema,
  WalletLoginBodySchema,
  WalletLoginResSchema,
} from './auth.model'

// Session DTOs
export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}
export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}
export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

// User response DTO
export class UserResDTO extends createZodDto(UserResSchema) {}

// Wallet auth DTOs
export class GetNonceQueryDTO extends createZodDto(GetNonceQuerySchema) {}
export class GetNonceResDTO extends createZodDto(GetNonceResSchema) {}
export class WalletLoginBodyDTO extends createZodDto(WalletLoginBodySchema) {}
export class WalletLoginResDTO extends createZodDto(WalletLoginResSchema) {}
