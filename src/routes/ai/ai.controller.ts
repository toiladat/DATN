import { Controller, Post, Body, Res, Ip, Req } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Response, Request } from 'express'
import { AiService } from './ai.service'
import { IsPublic } from 'src/shared/decorators/auth.decorator'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'
import { AccessTokenPayload } from 'src/shared/types/jwt.type'

@ApiTags('AI Virtual Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat-stream')
  @IsPublic()
  @ApiOperation({
    summary: 'Stream phản hồi của trợ lý ảo AI thông qua Server-Sent Events (SSE)',
  })
  async chatStream(
    @Body('message') message: string,
    @ActivateUser() user: AccessTokenPayload | undefined,
    @Ip() ipAddress: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 1. Thiết lập Header chuẩn cho Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Ngăn Nginx chặn buffer stream

    if (!message || !message.trim()) {
      res.write(`data: ${JSON.stringify({ text: '⚠️ Tin nhắn trống. Vui lòng nhập câu hỏi.' })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    // 2. Gọi service xử lý ngữ cảnh bảo mật và gọi Gemini API
    const result = await this.aiService.generateContentStream(message, user?.userId, ipAddress)

    // 3. Xử lý kịch bản Demo (Chưa cấu hình API Key)
    if (result.isDemo) {
      res.write(`data: ${JSON.stringify({ text: result.text })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    // 4. Xử lý kịch bản chạy thật: Stream kết quả thời gian thực
    try {
      // Lưu câu hỏi của người dùng vào lịch sử
      await this.aiService.saveMessageToHistory(result.session.id, 'user', message)

      let fullResponseText = ''

      // Lắng nghe sự kiện client tắt tab / hủy kết nối
      let clientDisconnected = false
      req.on('close', () => {
        clientDisconnected = true
      })

      for await (const chunk of result.stream) {
        if (clientDisconnected) {
          break
        }
        const text = chunk.text()
        fullResponseText += text

        // Gửi dòng chunk về Frontend
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }

      // Lưu câu trả lời của AI vào lịch sử sau khi stream hoàn thành
      if (!clientDisconnected && fullResponseText) {
        await this.aiService.saveMessageToHistory(result.session.id, 'ai', fullResponseText)
      }

      res.write('data: [DONE]\n\n')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Lỗi khi streaming dữ liệu AI:', err)
      res.write(`data: ${JSON.stringify({ text: '❌ Đã xảy ra lỗi gián đoạn đường truyền stream.' })}\n\n`)
    } finally {
      res.end()
    }
  }
}
