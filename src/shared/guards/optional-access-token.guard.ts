import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { REQUEST_USER_KEY } from '../constants/auth.constant'
import { TokenService } from './../services/token.service'

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    const authHeader = request.headers.authorization
    if (!authHeader) {
      return true // Cho phép khách vãng lai đi qua
    }

    const accessToken: string = authHeader.split(' ')[1]
    if (!accessToken) {
      return true // Cho phép khách vãng lai đi qua
    }

    try {
      const decodedAccessToken = await this.tokenService.verifyAccessToken(accessToken)
      request[REQUEST_USER_KEY] = decodedAccessToken
      return true
    } catch {
      // Nếu token lỗi hoặc hết hạn, vẫn cho qua dưới tư cách khách vãng lai
      return true
    }
  }
}
