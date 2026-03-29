import { Injectable } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import envConfig from 'src/shared/config'
import { v4 as uuidv4 } from 'uuid'
import { HashingService } from './../../shared/services/hashing.service'
import { GoogleUserInfoError } from './auth.error'
import { GoogleAuthStateType } from './auth.model'
import { AuthRepository } from './auth.repo'
import { AuthService } from './auth.service'
import { RolesService } from './roles.service'
@Injectable()
export class GoogleService {
  private oauth2Client: OAuth2Client
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly authService: AuthService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      envConfig.GOOGLE_CLIENT_ID,
      envConfig.GOOGLE_CLIENT_SECERET,
      envConfig.GOOGLE_REDIRECT_URI,
    )
  }

  geAuthorizationUrl({ userAgent, ip }: GoogleAuthStateType) {
    const scope = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']

    // Chuyen OBJ => String base64 an toan bỏ lên url
    const stateString = Buffer.from(
      JSON.stringify({
        userAgent,
        ip,
      }),
    ).toString('base64')
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scope,
      include_granted_scopes: true,
      state: stateString,
    })
    return { url }
  }

  async googleCallback({ code, state }: { code: string; state: string }) {
    try {
      let userAgent = ' unknown'
      let ip = ' unknown'
      //1 lấy state từ url
      try {
        if (state) {
          const clientInfor = JSON.parse(Buffer.from(state, 'base64').toString()) as GoogleAuthStateType
          userAgent = clientInfor.userAgent
          ip = clientInfor.ip
        }
      } catch (error) {
        console.log('Error parsing state: ', error)
      }

      //2 dùng code để lấy token

      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      //3 lấy infor user
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2',
      })
      const { data } = await oauth2.userinfo.get()

      if (!data.email) {
        throw GoogleUserInfoError
      }

      //Phải include Role vì ở trên data trả về là userIncludeRole
      let user = await this.authRepository.findUniqueUserIncludeRole({
        email: data.email,
      })
      // Nếu không có user là user mới, sẽ đăng ký
      if (!user) {
        const clientRoleId = await this.rolesService.getClientRoleId()
        const randomPassword = uuidv4()
        const hashPassword = await this.hashingService.hash(randomPassword)
        user = await this.authRepository.createUserIncludeRole({
          email: data.email,
          name: data.name ?? '',
          password: hashPassword,
          roleId: clientRoleId,
          avatar: data.picture ?? null,
        })
      }

      const device = await this.authRepository.createDevice({
        userId: user.id,
        userAgent,
        ip,
      })

      const authTokens = await this.authService.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: user.role.name,
      })

      return authTokens
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}
