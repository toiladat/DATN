import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import OTPEmail from 'src/emails/otp'
import envConfig from '../config'
@Injectable()
export class EmailService {
  private resend: Resend
  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY)
  }
  async sendOTP(payload: { email: string; code: string }) {
    const subject = 'Mã xác thực TOILADAT của bạn'
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: <OTPEmail otpCode={payload.code} title={subject} />,
    })
  }
}
