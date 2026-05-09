import { UnauthorizedException } from '@nestjs/common'

export const AdminInvalidCredentialsException = new UnauthorizedException('Error.AdminInvalidCredentials')
export const AdminAccountDisabledException = new UnauthorizedException('Error.AdminAccountDisabled')
export const AdminRefreshTokenAlreadyUsedException = new UnauthorizedException('Error.AdminRefreshTokenAlreadyUsed')
export const AdminUnauthorizedException = new UnauthorizedException('Error.AdminUnauthorized')
