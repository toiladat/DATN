import { Body, Container, Head, Heading, Html, Img, Section, Text } from '@react-email/components'
import * as React from 'react'

interface RejectMilestoneEmailProps {
  name: string
  projectName: string
  milestoneTitle: string
  reason: string
}

const logoUrl =
  'https://res.cloudinary.com/dlcgsmq4d/image/upload/v1747530543/468327416_1577416413168876_4798170012597070992_n_qmxnoi.jpg'

export const RejectMilestoneEmail = ({ name, projectName, milestoneTitle, reason }: RejectMilestoneEmailProps) => (
  <Html>
    <Head>
      <title>Cột mốc dự án chưa được phê duyệt</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="70" height="70" alt="Logo" style={logo} />
        <Text style={tertiary}>Thông báo từ hệ thống</Text>
        <Heading style={secondary}>Cột mốc chưa được phê duyệt</Heading>

        <Section style={messageContainer}>
          <Text style={paragraph}>
            Xin chào <strong style={{ color: '#000' }}>{name}</strong>,
          </Text>
          <Text style={paragraph}>
            Ban quản trị TOILADAT đã xem xét báo cáo tiến độ cột mốc{' '}
            <strong style={{ color: '#000' }}>{milestoneTitle}</strong> thuộc dự án{' '}
            <strong style={{ color: '#000' }}>{projectName}</strong> của bạn.
          </Text>
          <Text style={paragraph}>Tuy nhiên, cột mốc này hiện chưa thể được phê duyệt với lý do sau:</Text>
          <Text style={reasonBox}>{reason}</Text>
          <Text style={paragraph}>
            Vui lòng kiểm tra lại tiến độ công việc, bổ sung các minh chứng cần thiết và liên hệ với chúng tôi nếu bạn
            cần hỗ trợ.
          </Text>
          <Text style={paragraph}>Cảm ơn bạn đã đồng hành cùng TOILADAT.</Text>
        </Section>
      </Container>
      <Text style={footer}>From TOILADAT Admin with ❤️.</Text>
    </Body>
  </Html>
)

RejectMilestoneEmail.PreviewProps = {
  name: 'Đạt Đẹp Trai',
  projectName: 'Test Project',
  milestoneTitle: 'Giai đoạn 1',
  reason: 'Báo cáo chưa đầy đủ minh chứng thực tế.',
} as RejectMilestoneEmailProps

export default RejectMilestoneEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #eee',
  borderRadius: '5px',
  boxShadow: '0 5px 10px rgba(20,50,70,.2)',
  marginTop: '20px',
  maxWidth: '480px',
  margin: '0 auto',
  padding: '68px 0 130px',
}

const logo = {
  margin: '0 auto',
  width: '70px',
  height: '70px',
  borderRadius: '100%',
  display: 'block',
}

const tertiary = {
  color: '#e11d48', // Red color for rejection
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  height: '16px',
  letterSpacing: '0',
  lineHeight: '16px',
  margin: '16px 8px 8px 8px',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
}

const secondary = {
  color: '#000',
  display: 'inline-block',
  fontFamily: 'HelveticaNeue-Medium,Helvetica,Arial,sans-serif',
  fontSize: '20px',
  fontWeight: 500,
  lineHeight: '24px',
  marginBottom: '20px',
  marginTop: '0',
  textAlign: 'center' as const,
  width: '100%',
}

const messageContainer = {
  padding: '0 20px',
  textAlign: 'left' as const,
}

const paragraph = {
  color: '#444',
  fontSize: '15px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  letterSpacing: '0',
  lineHeight: '23px',
  margin: '0 0 15px 0',
}

const reasonBox = {
  backgroundColor: '#fef2f2', // light red background
  border: '1px solid #fecaca',
  borderRadius: '4px',
  color: '#991b1b', // dark red text
  padding: '12px 16px',
  fontSize: '14px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  fontStyle: 'italic',
  margin: '0 0 15px 0',
}

const footer = {
  color: '#000',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0',
  lineHeight: '23px',
  margin: '0',
  marginTop: '20px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
}
