import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'

// Auth token related errors
export const RefreshTokenAlreadyUsedException = new UnauthorizedException('Error.RefreshTokenAlreadyUsed')
export const UnauthorizedAccessException = new UnauthorizedException('Error.UnauthorizedAccess')

// Wallet auth related errors
export const InvalidWalletSignatureException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidWalletSignature',
    path: 'signature',
  },
])

export const WalletAddressNotFoundException = new UnprocessableEntityException([
  {
    message: 'Error.WalletAddressNotFound',
    path: 'walletAddress',
  },
])

export const WalletNonceNotFoundException = new UnprocessableEntityException([
  {
    message: 'Error.WalletNonceNotFound',
    path: 'walletAddress',
  },
])

// KYC related errors
export const EmailAlreadyInUseException = new UnprocessableEntityException([
  {
    message: 'Error.EmailAlreadyInUse',
    path: 'email',
  },
])
