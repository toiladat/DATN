import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import envConfig from 'src/shared/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI | null = null

  constructor(private readonly prisma: PrismaService) {
    if (envConfig.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(envConfig.GEMINI_API_KEY)
    }
  }

  /**
   * Truy xuất ngữ cảnh bảo mật và lịch sử hội thoại, gọi Gemini API để stream kết quả
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
      `1. NGUYÊN TẮC NGẮN GỌN & THÂN THIỆN: Hãy trả lời cực kỳ ngắn gọn, tự nhiên, súc tích và đi thẳng vào vấn đề. .\n` +
      `2. NGUYÊN TẮC TRUNG THỰC TUYỆT ĐỐI: Chỉ trả lời dựa trên thông tin thực tế được cung cấp trong NGỮ CẢNH HỆ THỐNG ở trên. TUYỆT ĐỐI KHÔNG tự bịa đặt, giả định hoặc tự sáng tác ra bất kỳ dự án hư cấu nào. Nếu không tìm thấy thông tin phù hợp trong Ngữ cảnh hệ thống, hãy lịch sự thông báo rằng hệ thống hiện chưa có dự án hay thông tin liên quan đến từ khóa đó và gợi ý họ tham khảo các dự án hiện có trong hệ thống.\n` +
      `3. TUYỆT ĐỐI KHÔNG dùng cú pháp Markdown thô như dấu sao (**), dấu gạch ngang thô (-), dấu thăng (#) hay ký tự huyền (\`). Hãy trả về văn bản tiếng Việt thuần tự nhiên, ngăn cách bằng emoji hoặc xuống dòng bình thường.\n` +
      `4. Để dẫn chứng trực quan các dự án, ví hoặc mã giao dịch, hãy sử dụng chính xác các CÚ PHÁP ĐẶC BIỆT sau đây (chỉ dùng thông tin chính xác lấy từ Ngữ cảnh hệ thống, KHÔNG ĐƯỢC tự bịa đặt thông tin):\n` +
      `   * Dẫn chứng Dự án: [PROJECT: Tên dự án | slug-du-an | Link ảnh bìa nếu có | Trạng thái | Số tiền đã gọi | Số tiền mục tiêu]\n` +
      `     (Lấy thông tin chính xác từ Ngữ cảnh, ví dụ: [PROJECT: VaultPrime | vault-prime | https://picsum.photos/200 | PROGRESS | 1500 | 5000])\n` +
      `   * Dẫn chứng địa chỉ ví: [WALLET: Địa chỉ ví (ví dụ 0xabc...)]\n` +
      `   * Dẫn chứng giao dịch: [TX: Mã giao dịch txHash]\n` +
      `   * Dẫn chứng hình ảnh: [IMAGE: Mô tả ngắn | Link ảnh]\n` +
      `5. Giữ giọng điệu ấm áp, thông minh, sẵn sàng hỗ trợ, xưng "Tôi" hoặc "FundHive" và gọi người dùng là "bạn".`

    // Lấy lịch sử hội thoại gần nhất (tối đa 10 tin nhắn để giữ ngữ cảnh tự nhiên)
    const messagesHistory = (session.messages as any[]) || []
    const lastMessages = messagesHistory.slice(-10)

    // Tạo nội dung cho Gemini
    const contents: any[] = []

    // Nạp lịch sử
    for (const msg of lastMessages) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })
    }

    // Nạp câu hỏi mới của người dùng
    contents.push({
      role: 'user',
      parts: [{ text: userQuery }],
    })

    // 6. Kiểm tra cấu hình API Key
    if (!this.genAI) {
      // Mock stream hoặc trả về cảnh báo nếu chưa điền API Key
      return {
        isDemo: true,
        text: '⚠️ Trợ lý ảo AI FundHive đã được thiết lập thành công ở Backend NestJS và MongoDB Atlas!\n\nTuy nhiên, biến môi trường `GEMINI_API_KEY` trong file `BE/.env` hiện đang để trống. Vui lòng thêm API Key của bạn để trải nghiệm tính năng chat trực tiếp bằng AI nhé.',
      }
    }

    // 7. Gọi Gemini API Stream
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemInstruction,
      })
      const result = await model.generateContentStream({ contents })
      return {
        isDemo: false,
        stream: result.stream,
        session,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Lỗi gọi Gemini SDK:', error)
      return {
        isDemo: true,
        text: '🤖 Trợ lý ảo FundHive hiện đang bận hoặc gặp sự cố kết nối tạm thời. Bạn vui lòng chờ một lát rồi gửi lại tin nhắn nhé! Cảm ơn sự thông cảm của bạn. 🙏',
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
