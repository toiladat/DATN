import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { REQUEST_USER_KEY } from '../constants/auth.constant'
import { TokenService } from './../services/token.service'

@Injectable()
export class AdminAccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    let accessToken: string = request.headers.authorization?.split(' ')[1]
    if (!accessToken && request.query?.token) {
      accessToken = request.query.token as string
    }

    if (!accessToken) {
      return false
    }
    try {
      const decodedAccessToken = await this.tokenService.verifyAdminAccessToken(accessToken)
      request[REQUEST_USER_KEY] = decodedAccessToken
      return true
    } catch {
      throw new UnauthorizedException('Invalid or missing admin token')
    }
  }
}
