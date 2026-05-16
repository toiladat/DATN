import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import OTPEmail from 'src/emails/otp'
import BanEmail from 'src/emails/ban'
import RejectProjectEmail from 'src/emails/reject-project'
import ApproveProjectEmail from 'src/emails/approve-project'
import ApproveMilestoneEmail from 'src/emails/approve-milestone'
import RejectMilestoneEmail from 'src/emails/reject-milestone'
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

  async sendBanNotification(payload: { email: string; name: string; reason?: string }) {
    const subject = 'Tài khoản của bạn đã bị khóa'
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: <BanEmail name={payload.name} reason={payload.reason} />,
    })
  }

  async sendRejectProjectNotification(payload: { email: string; name: string; projectName: string; reason: string }) {
    const subject = `Dự án "${payload.projectName}" chưa được phê duyệt`
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: <RejectProjectEmail name={payload.name} projectName={payload.projectName} reason={payload.reason} />,
    })
  }

  async sendApproveProjectNotification(payload: { email: string; name: string; projectName: string }) {
    const subject = `Dự án "${payload.projectName}" đã được phê duyệt!`
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: <ApproveProjectEmail name={payload.name} projectName={payload.projectName} />,
    })
  }

  async sendApproveMilestoneNotification(payload: {
    email: string
    name: string
    projectName: string
    milestoneTitle: string
  }) {
    const subject = `Cột mốc "${payload.milestoneTitle}" thuộc dự án "${payload.projectName}" đã được phê duyệt!`
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: (
        <ApproveMilestoneEmail
          name={payload.name}
          projectName={payload.projectName}
          milestoneTitle={payload.milestoneTitle}
        />
      ),
    })
  }

  async sendRejectMilestoneNotification(payload: {
    email: string
    name: string
    projectName: string
    milestoneTitle: string
    reason: string
  }) {
    const subject = `Cột mốc "${payload.milestoneTitle}" thuộc dự án "${payload.projectName}" chưa được phê duyệt`
    return this.resend.emails.send({
      from: 'TOILADAT <no-reply@toiladat.online>',
      to: [payload.email],
      subject,
      react: (
        <RejectMilestoneEmail
          name={payload.name}
          projectName={payload.projectName}
          milestoneTitle={payload.milestoneTitle}
          reason={payload.reason}
        />
      ),
    })
  }
}
