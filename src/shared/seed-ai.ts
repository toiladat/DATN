/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const faqs = [
  {
    category: 'faq',
    question: 'FundHive là gì?',
    answer:
      'FundHive (tên giao diện hiển thị là VAULT_PRIME) là một nền tảng gọi vốn cộng đồng (Crowdfunding) phi tập trung thế hệ mới Web3, mang phong cách tương lai Cyberpunk. Nền tảng cho phép các nhà phát triển/nhà sáng lập dự án (Creators) đưa ra ý tưởng và lộ trình thực hiện để gọi vốn bằng đồng tiền mã hóa mUSDT từ các nhà đầu tư (Investors) toàn cầu. Điểm độc đáo của FundHive là cơ chế giải ngân theo từng cột mốc (Milestones) được kiểm duyệt chặt chẽ để bảo vệ dòng tiền đầu tư tối đa.',
    keywords: ['fundhive', 'vaultprime', 'la gi', 'gioi thieu', 'tong quan', 'web3', 'crowdfunding'],
  },
  {
    category: 'fees',
    question: 'Phí dịch vụ gọi vốn trên FundHive là bao nhiêu?',
    answer:
      'FundHive áp dụng cơ chế phi tập trung bảo vệ người dùng và duy trì hệ thống với mức phí gọi vốn cực thấp. Đối với các dự án gọi vốn thành công, nền tảng sẽ thu một khoản phí dịch vụ nhỏ tính trên tổng số vốn huy động được (thường dao động khoảng 2-5% tùy theo cấu hình hợp đồng thông minh). Nếu dự án gọi vốn thất bại, không có bất kỳ khoản phí nào được thu và 100% tiền sẽ được hoàn trả đầy đủ cho nhà đầu tư.',
    keywords: ['phi', 'phi dich vu', 'chiet khau', 'ton phi', 'mat phi', 'goi von', 'nang cap'],
  },
  {
    category: 'investment-rules',
    question: 'Đồng tiền mUSDT là gì? Làm sao để sử dụng và nạp mUSDT đầu tư?',
    answer:
      'mUSDT (Mock USDT) là đồng stablecoin định danh chuẩn ERC20 được sử dụng chính thức trên nền tảng FundHive để thực hiện các giao dịch đầu tư và giải ngân. Để đầu tư, bạn cần: \n1. Kết nối ví Web3 cá nhân (như MetaMask, Rabby, Coinbase Wallet) thông qua cổng Connect Wallet (sử dụng RainbowKit) ở góc phải màn hình.\n2. Đảm bảo ví có đủ số dư mUSDT trên mạng lưới blockchain được hỗ trợ. Nếu cần nhận mUSDT thử nghiệm (Faucet), bạn có thể liên hệ Ban Quản trị hoặc sử dụng tính năng Faucet tích hợp trên mạng thử nghiệm của chúng tôi.\n3. Chọn dự án yêu thích, nhấn "Đầu tư" (Invest), nhập số lượng và ký xác nhận trên ví để hoàn tất giao dịch.',
    keywords: ['musdt', 'tien', 'stablecoin', 'nap tien', 'faucet', 'dau tu', 'ket noi vi'],
  },
  {
    category: 'faq',
    question: 'Cơ chế hoàn tiền (Refund) hoạt động như thế nào khi dự án thất bại?',
    answer:
      'Để bảo vệ quyền lợi tối đa cho nhà đầu tư, FundHive áp dụng cơ chế Hợp đồng thông minh tự động hoàn trả (Automatic Refund) cực kỳ minh bạch:\n- Khi một dự án hết hạn thời gian gọi vốn nhưng không đạt được mục tiêu gây quỹ (Funding Goal), trạng thái dự án sẽ chuyển sang "EXPIRED" hoặc "FAILED".\n- Lúc này, nút "Hoàn tiền" (Refund) hoặc yêu cầu rút lại tiền sẽ xuất hiện trên trang chi tiết dự án dành riêng cho các nhà đầu tư.\n- Nhà đầu tư chỉ cần nhấn chọn "Refund" và xác nhận giao dịch trên ví cá nhân. Hợp đồng thông minh sẽ ngay lập tức trả lại 100% số lượng mUSDT bạn đã đầu tư về ví của bạn mà không thu bất kỳ khoản phí chuyển đổi nào.',
    keywords: ['hoan tien', 'refund', 'rut tien ve', 'that bai', 'khong dat muc tieu', 'tra lai tien'],
  },
  {
    category: 'milestone-guide',
    question: 'Quy trình giải ngân theo từng cột mốc (Milestones) hoạt động thế nào?',
    answer:
      'Không giống các nền tảng truyền thống cho phép rút toàn bộ tiền ngay lập tức, FundHive thực hiện cơ chế giải ngân an toàn theo pha:\n1. Khi dự án gọi vốn thành công, toàn bộ số vốn sẽ được khóa an toàn trong Smart Contract quản lý dự án.\n2. Số vốn được chia nhỏ tương ứng với các Milestone (Mốc phát triển) mà Creator đã cam kết.\n3. Khi hoàn thành một mốc phát triển, Creator phải đăng tải báo cáo tiến trình (Milestone Update) kèm tài liệu, hình ảnh, video chứng minh tiến độ.\n4. Admin hệ thống và các nhà đầu tư sẽ tiến hành kiểm duyệt báo cáo. Khi báo cáo được phê duyệt (Approved), trạng thái Milestone chuyển sang "APPROVED" hoặc "COMPLETED".\n5. Creator sẽ được phép kích hoạt nút "Rút vốn" (Withdraw) trên chuỗi để chuyển số tiền phân bổ cho cột mốc đó về ví của mình để tiếp tục phát triển mốc tiếp theo.',
    keywords: ['milestone', 'giai ngan', 'cot moc', 'rut von', 'rut tien', 'phe duyet', 'approved', 'withdraw'],
  },
  {
    category: 'faq',
    question: 'Làm thế nào để tạo và đưa một dự án gọi vốn lên hệ thống?',
    answer:
      'Để bắt đầu đưa ý tưởng của bạn thành hiện thực trên FundHive:\n1. Nhấp chọn mục "Launch Project" trên thanh điều hướng.\n2. Điền đầy đủ thông tin dự án bao gồm: Tiêu đề, Mô tả chi tiết, Rủi ro thách thức, Số tiền cần gọi vốn (Funding Goal), Thời gian bắt đầu và kết thúc.\n3. Định nghĩa các Milestone (Mốc phát triển) tương ứng với kế hoạch và phân bổ tỷ lệ phần trăm tiền giải ngân cho mỗi mốc.\n4. Tải lên hình ảnh, video giới thiệu ấn tượng.\n5. Gửi yêu cầu duyệt. Ban Quản trị hệ thống (Admin) sẽ kiểm tra tính xác thực của thông tin. Sau khi Admin phê duyệt ("APPROVED"), bạn có thể tiến hành kích hoạt đưa dự án lên chuỗi (On-chain Launch) để dự án bắt đầu nhận đầu tư công khai.',
    keywords: ['tao du an', 'goi von', 'dua du an len', 'dang ky du an', 'duyet du an', 'launch project', 'milestone'],
  },
  {
    category: 'faq',
    question: 'Làm sao để kiểm tra tính minh bạch và uy tín của dự án?',
    answer:
      'Mọi thông tin gọi vốn trên FundHive đều được minh bạch hóa tối đa trên Blockchain:\n1. Mọi giao dịch đầu tư, trạng thái quỹ, và lịch sử rút vốn của từng Milestone đều được ghi nhận trực tiếp on-chain. Bạn có thể kiểm tra hash giao dịch (TxHash) công khai ở mục lịch sử.\n2. Hệ thống KYC: Trạng thái của từng Creator (đã KYC hay chưa) được hiển thị rõ ràng trên thông tin thành viên dự án.\n3. Hồ sơ Milestone Update: Mỗi khi rút vốn cột mốc, Creator bắt buộc phải cung cấp bằng chứng rõ ràng (ảnh thực tế, video sản phẩm, đường link chạy thử). Nhà đầu tư có quyền đánh giá và thảo luận trực tiếp thông qua phần bình luận của dự án.',
    keywords: ['minh bach', 'uy tin', 'an toan', 'lua dao', 'kiem tra', 'kyc', 'giao dich', 'txhash'],
  },
  {
    category: 'faq',
    question: 'Làm sao khi gặp sự cố kỹ thuật hoặc lỗi giao dịch on-chain?',
    answer:
      'Nếu bạn gặp các lỗi như: Gas Limit quá cao khi giao dịch ví, giao dịch pending quá lâu, lỗi hiển thị số dư, hoặc lỗi không rút được Milestone:\n1. Hãy chắc chắn ví của bạn đang kết nối đúng mạng blockchain thử nghiệm được chỉ định của FundHive.\n2. Đảm bảo ví có đủ đồng tiền native của mạng (ví dụ: Sepolia ETH, Arbitrum ETH...) để làm phí gas.\n3. Nếu giao dịch đã thành công trên mạng lưới nhưng website chưa cập nhật, hãy tải lại trang (F5) hoặc chờ 1-2 phút để hệ thống lắng nghe sự kiện (Event Indexer) đồng bộ.\n4. Bạn cũng có thể gửi phản hồi trực tiếp cho Admin thông qua chatbox trợ lý ảo này bằng cách mô tả lỗi kèm TxHash, chúng tôi sẽ hỗ trợ kiểm tra lập tức.',
    keywords: ['loi', 'su co', 'gas', 'pending', 'loi giao dich', 'khong rut duoc', 'giup do', 'support'],
  },
]

async function main() {
  console.log('Bắt đầu nạp dữ liệu tri thức tĩnh vào bảng SystemKnowledge...')

  // Clear existing records to avoid duplicates
  await prisma.systemKnowledge.deleteMany({})
  console.log('Đã dọn dẹp các bản ghi cũ.')

  for (const faq of faqs) {
    await prisma.systemKnowledge.create({
      data: faq,
    })
  }

  console.log(`Đã nạp thành công ${faqs.length} câu hỏi tri thức vào MongoDB Atlas!`)
}

main()
  .catch((e) => {
    console.error('Lỗi nạp dữ liệu:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
