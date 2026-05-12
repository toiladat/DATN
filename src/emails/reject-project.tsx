import { Body, Container, Head, Heading, Html, Img, Section, Text } from '@react-email/components'
import * as React from 'react'

interface RejectProjectEmailProps {
  name: string
  projectName: string
  reason: string
}

const logoUrl =
  'https://res.cloudinary.com/dlcgsmq4d/image/upload/v1747530543/468327416_1577416413168876_4798170012597070992_n_qmxnoi.jpg'

export const RejectProjectEmail = ({ name, projectName, reason }: RejectProjectEmailProps) => (
  <Html>
    <Head>
      <title>Dự án của bạn chưa được phê duyệt</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Img src={logoUrl} width="70" height="70" alt="Logo" style={logo} />
        <Text style={tertiary}>Thông báo từ hệ thống</Text>
        <Heading style={secondary}>Dự án chưa được phê duyệt</Heading>

        <Section style={messageContainer}>
          <Text style={paragraph}>
            Xin chào <strong style={{ color: '#000' }}>{name}</strong>,
          </Text>
          <Text style={paragraph}>
            Cảm ơn bạn đã gửi dự án <strong style={{ color: '#000' }}>{projectName}</strong> đến TOILADAT. Sau khi xem
            xét, chúng tôi rất tiếc phải thông báo rằng dự án của bạn chưa đáp ứng được các tiêu chí phê duyệt hiện tại.
          </Text>
          <Text style={paragraph}>
            <strong>Lý do:</strong> {reason}
          </Text>
          <Text style={paragraph}>
            Bạn có thể chỉnh sửa và nộp lại dự án sau khi đã khắc phục các vấn đề nêu trên. Nếu có thắc mắc, vui lòng
            liên hệ với bộ phận hỗ trợ của chúng tôi để được giải đáp.
          </Text>
        </Section>
      </Container>
      <Text style={footer}>From TOILADAT Admin with ❤️.</Text>
    </Body>
  </Html>
)

RejectProjectEmail.PreviewProps = {
  name: 'Đạt Đẹp Trai',
  projectName: 'Test Project',
  reason: 'Dự án thiếu thông tin chi tiết về kế hoạch triển khai và ngân sách.',
} as RejectProjectEmailProps

export default RejectProjectEmail

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
  color: '#e63946',
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
