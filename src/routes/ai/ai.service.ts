import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import envConfig from 'src/shared/config'
import OpenAI from 'openai'

@Injectable()
export class AiService {
  private openai: OpenAI | null = null

  constructor(private readonly prisma: PrismaService) {
    if (envConfig.OPENROUTER_API_KEY) {
      const isOpenRouter = envConfig.OPENROUTER_BASE_URL?.includes('openrouter.ai')
      this.openai = new OpenAI({
        apiKey: envConfig.OPENROUTER_API_KEY,
        baseURL: envConfig.OPENROUTER_BASE_URL || undefined,
        defaultHeaders: isOpenRouter
          ? {
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'FundHive',
            }
          : undefined,
      })
    }
  }

  /**
   * Truy xuất ngữ cảnh bảo mật và lịch sử hội thoại, gọi OpenAI/OpenRouter API để stream kết quả
   */
  async generateContentStream(userQuery: string, userId?: string, ipAddress?: string): Promise<any> {
    // 1. Quản lý Phiên hội thoại (Session) để lưu lịch sử
    const session = await this.getOrCreateChatSession(userId, ipAddress)

    // 2. Phân tích từ khóa để tìm FAQ tĩnh trong SystemKnowledge
    const words = userQuery
      .toLowerCase()
      .replace(new RegExp('[.,/#!$%^&*;:{}=\\-_`~()?]', 'g'), '')
      .split(/\s+/)
      .filter((w) => w.length > 1)

    const matchedKnowledge = await this.prisma.systemKnowledge.findMany({
      where: {
        keywords: {
          hasSome: words,
        },
      },
    })

    // 3. Phân quyền truy cập Context động (Dự án, Đầu tư, Milestones)
    let userContextString = ''
    let publicProjectsContext = ''

    // Khách vãng lai và thành viên đều được xem các dự án công khai đang hoạt động
    const publicProjects = await this.prisma.project.findMany({
      where: {
        status: { in: ['PROGRESS', 'ACTIVE'] },
      },
      select: {
        title: true,
        slug: true,
        raisedAmount: true,
        totalAmount: true,
        status: true,
        startDate: true,
        endDate: true,
        images: true,
        subtitle: true,
      },
    })

    if (publicProjects.length > 0) {
      publicProjectsContext =
        `DỰ ÁN ĐANG GÂY QUỸ/HOẠT ĐỘNG TRÊN NỀN TẢNG:\n` +
        publicProjects
          .map(
            (p) =>
              `- Tên: ${p.title}, Slug: ${p.slug}, Đã huy động: ${p.raisedAmount} mUSDT, Mục tiêu: ${p.totalAmount} mUSDT, Trạng thái: ${p.status}, Ảnh bìa: ${p.images && p.images[0] ? p.images[0] : ''}`,
          )
          .join('\n')
    }

    // Nếu người dùng đã đăng nhập, lấy thêm thông tin cá nhân của họ
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true, name: true, status: true },
      })

      const myProjects = await this.prisma.project.findMany({
        where: { userId },
        include: { milestones: true },
      })

      const myInvestments = await this.prisma.investment.findMany({
        where: { userId },
        include: { project: true },
      })

      userContextString =
        `THÔNG TIN NGƯỜI DÙNG ĐANG ĐĂNG NHẬP:\n` +
        `- Tên/Wallet: ${user?.name || 'Chưa đặt tên'} (${user?.walletAddress})\n` +
        `- Trạng thái tài khoản: ${user?.status}\n`

      if (myProjects.length > 0) {
        userContextString +=
          `Dự án do người dùng này tạo ra:\n` +
          myProjects
            .map(
              (p) =>
                `  * Dự án: ${p.title} (Slug: ${p.slug}, Trạng thái: ${p.status}, Ảnh bìa: ${p.images && p.images[0] ? p.images[0] : ''}, Đã gọi: ${p.raisedAmount}, Mục tiêu: ${p.totalAmount}). Các mốc phát triển:\n` +
                p.milestones
                  .map((m) => `    - Mốc ${m.order}: ${m.title} (Trạng thái: ${m.status}, Số tiền: ${m.amount} mUSDT)`)
                  .join('\n'),
            )
            .join('\n') +
          '\n'
      }

      if (myInvestments.length > 0) {
        userContextString +=
          `Lịch sử các khoản đầu tư của người dùng này:\n` +
          myInvestments
            .map(
              (inv) =>
                `  * Đã đầu tư ${inv.amount} mUSDT vào dự án "${inv.project.title}" (Slug: ${inv.project.slug}, Giao dịch/TxHash: ${inv.txHash || ''}, Trạng thái: ${inv.status}, Ảnh bìa: ${inv.project.images && inv.project.images[0] ? inv.project.images[0] : ''})`,
            )
            .join('\n') +
          '\n'
      }
    }

    // 4. Tổng hợp FAQ tĩnh
    let faqContext = ''
    if (matchedKnowledge.length > 0) {
      faqContext =
        `QUY TẮC VÀ HƯỚNG DẪN HỆ THỐNG LIÊN QUAN:\n` +
        matchedKnowledge.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')
    }

    // 5. Cấu trúc Prompt an toàn
    const systemInstruction =
      `Bạn là trợ lý ảo AI thông minh của nền tảng gọi vốn cộng đồng Web3 FundHive.\n` +
      `Hãy sử dụng NGỮ CẢNH HỆ THỐNG dưới đây để trả lời câu hỏi của người dùng một cách chính xác.\n\n` +
      `NGỮ CẢNH HỆ THỐNG:\n` +
      `${faqContext}\n\n` +
      `${publicProjectsContext}\n\n` +
      `${userContextString}\n\n` +
      `QUY TẮC TRẢ LỜI & ĐỊNH DẠNG (CỰC KỲ QUAN TRỌNG):\n` +
      `1. QUY TẮC NGÔN NGỮ: Bạn PHẢI LUÔN LUÔN trả lời bằng tiếng Việt (Vietnamese) trong mọi tình huống. Tuyệt đối không bao giờ được sử dụng tiếng Pháp, tiếng Anh hay bất kỳ ngôn ngữ nào khác.\n` +
      `2. NGUYÊN TẮC SIÊU NGẮN GỌN: Hãy trả lời cực kỳ ngắn gọn (chỉ từ 1 đến 2 câu ngắn). TUYỆT ĐỐI không giải thích dông dài, không viết lan man.\n` +
      `3. TRÁNH TRÙNG LẶP THÔNG TIN: Khi đã dẫn chứng dự án bằng thẻ đặc biệt [PROJECT: ...], bạn KHÔNG ĐƯỢC viết lại hoặc mô tả lại các thông tin của dự án đó (như trạng thái, số tiền đã gọi, mục tiêu) bằng chữ thường ở bên ngoài. Người dùng sẽ nhìn thấy tất cả thông tin này trên thẻ dự án rồi.\n` +
      `4. NGUYÊN TẮC TRUNG THỰC TUYỆT ĐỐI: Chỉ trả lời dựa trên thông tin thực tế được cung cấp trong NGỮ CẢNH HỆ THỐNG ở trên. TUYỆT ĐỐI KHÔNG tự bịa đặt, giả định hoặc tự sáng tác ra bất kỳ dự án hư cấu nào. Nếu không tìm thấy thông tin phù hợp, hãy lịch sự thông báo rằng hệ thống hiện chưa có dự án hay thông tin liên quan đến từ khóa đó.\n` +
      `5. TUYỆT ĐỐI KHÔNG dùng cú pháp Markdown thô như dấu sao (**), dấu gạch ngang thô (-), dấu thăng (#) hay ký tự huyền (\`). Hãy trả về văn bản tiếng Việt thuần tự nhiên, ngăn cách bằng emoji hoặc xuống dòng bình thường.\n` +
      `6. Để dẫn chứng trực quan các dự án, ví hoặc mã giao dịch, hãy sử dụng chính xác các CÚ PHÁP ĐẶC BIỆT sau đây (chỉ dùng thông tin chính xác lấy từ Ngữ cảnh hệ thống, sao chép CHÍNH XÁC link ảnh, TUYỆT ĐỐI KHÔNG được thêm từ khóa "slug: " vào trường slug):\n` +
      `   * Dẫn chứng Dự án: [PROJECT: Tên dự án | slug-du-an | Link ảnh bìa | Trạng thái | Số tiền đã gọi | Số tiền mục tiêu]\n` +
      `     (Ví dụ đúng: [PROJECT: VaultPrime | vault-prime | https://picsum.photos/200 | PROGRESS | 1500 | 5000]. Ví dụ sai: [PROJECT: VaultPrime | slug: vault-prime | ...])\n` +
      `   * Dẫn chứng địa chỉ ví: [WALLET: Địa chỉ ví (ví dụ 0xabc...)]\n` +
      `   * Dẫn chứng giao dịch: [TX: Mã giao dịch txHash]\n` +
      `   * Dẫn chứng hình ảnh: [IMAGE: Mô tả ngắn | Link ảnh]\n` +
      `7. Giữ giọng điệu ấm áp, thông minh, sẵn sàng hỗ trợ, xưng "Tôi" hoặc "FundHive" và gọi người dùng là "bạn".`

    // Lấy lịch sử hội thoại gần nhất (tối đa 10 tin nhắn để giữ ngữ cảnh tự nhiên)
    const messagesHistory = (session.messages as any[]) || []
    const lastMessages = messagesHistory.slice(-10)

    // 6. Kiểm tra cấu hình API Key
    if (!this.openai) {
      return {
        isDemo: true,
        text: '⚠️ Trợ lý ảo AI FundHive đã được thiết lập thành công ở Backend NestJS và MongoDB Atlas!\n\nTuy nhiên, biến môi trường `OPENROUTER_API_KEY` trong file `BE/.env` hiện đang để trống. Vui lòng thêm API Key của bạn để trải nghiệm tính năng chat trực tiếp bằng AI nhé.',
      }
    }

    // 7. Gọi OpenAI/OpenRouter API Stream
    try {
      const messages: any[] = [{ role: 'system', content: systemInstruction }]

      // Nạp lịch sử
      for (const msg of lastMessages) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })
      }

      // Nạp câu hỏi mới của người dùng
      messages.push({
        role: 'user',
        content: userQuery,
      })

      const modelName = envConfig.OPENROUTER_MODEL || 'openrouter/free'
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: messages,
        stream: true,
      })

      // Map OpenAI chunk schema sang Gemini stream chunk { text: () => string } để tương thích với controller
      const mappedStream = (async function* () {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            yield {
              text: () => text,
            }
          }
        }
      })()

      return {
        isDemo: false,
        stream: mappedStream,
        session,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Lỗi gọi OpenAI/OpenRouter SDK:', error)
      return {
        isDemo: true,
        text: '🤖 Trợ lý ảo FundHive hiện đang bận hoặc gặp sự cố kết nối tạm thời với OpenRouter. Bạn vui lòng chờ một lát rồi gửi lại tin nhắn nhé! Cảm ơn sự thông cảm của bạn. 🙏',
      }
    }
  }

  /**
   * Lưu trữ tin nhắn mới vào lịch sử cuộc trò chuyện
   */
  async saveMessageToHistory(sessionId: string, sender: 'user' | 'ai', text: string) {
    const session = await this.prisma.aiChatSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) return

    const messages = (session.messages as any[]) || []
    messages.push({
      sender,
      text,
      timestamp: new Date(),
    })

    await this.prisma.aiChatSession.update({
      where: { id: sessionId },
      data: {
        messages,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Lấy hoặc tạo phiên hội thoại mới cho User/IP
   */
  private async getOrCreateChatSession(userId?: string, ipAddress?: string) {
    const ip = ipAddress || '127.0.0.1'

    if (userId) {
      const existing = await this.prisma.aiChatSession.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })
      if (existing) return existing

      return this.prisma.aiChatSession.create({
        data: {
          userId,
          ipAddress: ip,
          messages: [],
        },
      })
    } else {
      const existing = await this.prisma.aiChatSession.findFirst({
        where: { ipAddress: ip, userId: null },
        orderBy: { updatedAt: 'desc' },
      })
      if (existing) return existing

      return this.prisma.aiChatSession.create({
        data: {
          ipAddress: ip,
          messages: [],
        },
      })
    }
  }
}
