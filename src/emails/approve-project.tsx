import { Body, Container, Head, Heading, Html, Img, Section, Text } from '@react-email/components'
import * as React from 'react'

interface ApproveProjectEmailProps {
  name: string
  projectName: string
}

const logoUrl =
  'https://res.cloudinary.com/dlcgsmq4d/image/upload/v1747530543/468327416_1577416413168876_4798170012597070992_n_qmxnoi.jpg'

export const ApproveProjectEmail = ({ name, projectName }: ApproveProjectEmailProps) => (
  <Html>
    <Head>
      <title>Dự án của bạn đã được phê duyệt!</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="70" height="70" alt="Logo" style={logo} />
        <Text style={tertiary}>Thông báo từ hệ thống</Text>
        <Heading style={secondary}>🎉 Dự án đã được phê duyệt!</Heading>

        <Section style={messageContainer}>
          <Text style={paragraph}>
            Xin chào <strong style={{ color: '#000' }}>{name}</strong>,
          </Text>
          <Text style={paragraph}>
            Chúc mừng! Dự án <strong style={{ color: '#000' }}>{projectName}</strong> của bạn đã được Ban quản trị
            TOILADAT phê duyệt thành công.
          </Text>
          <Text style={paragraph}>
            Dự án của bạn hiện đã sẵn sàng để công khai và bắt đầu kêu gọi đầu tư từ cộng đồng. Hãy chia sẻ dự án của
            bạn để thu hút nhiều nhà đầu tư tiềm năng nhé!
          </Text>
          <Text style={paragraph}>
            Cảm ơn bạn đã tin tưởng và đồng hành cùng TOILADAT. Chúc dự án của bạn thành công!
          </Text>
        </Section>
      </Container>
      <Text style={footer}>From TOILADAT Admin with ❤️.</Text>
    </Body>
  </Html>
)

ApproveProjectEmail.PreviewProps = {
  name: 'Đạt Đẹp Trai',
  projectName: 'Test Project',
} as ApproveProjectEmailProps

export default ApproveProjectEmail

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
  color: '#059669',
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
