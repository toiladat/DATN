/* eslint-disable no-console */
import { PrismaClient, MilestoneStatus, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Tiện ích tạo slug
function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  console.log('=== BẮT ĐẦU SEED DỮ LIỆU DỰ ÁN VÀ ĐÓNG GÓP HÌNH MẪU ===')

  // 1. Dọn dẹp dữ liệu dự án cũ để đảm bảo sạch sẽ
  try {
    await prisma.withdrawalRecord.deleteMany({})
    await prisma.milestoneUpdate.deleteMany({})
    await prisma.milestone.deleteMany({})
    await prisma.investment.deleteMany({})
    await prisma.like.deleteMany({})
    await prisma.review.deleteMany({})
    await prisma.projectMember.deleteMany({})
    await prisma.projectAttachment.deleteMany({})
    await prisma.projectCategory.deleteMany({})
    await prisma.project.deleteMany({})
    console.log('✔ Đã dọn dẹp sạch sẽ các dự án và dữ liệu liên quan cũ.')
  } catch (error) {
    console.warn('Cảnh báo khi dọn dẹp dữ liệu cũ (có thể chưa có bảng):', error)
  }

  // 2. Lấy hoặc tạo Người dùng Test (Founder/Chủ dự án)
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'founder@fundhive.org',
        name: 'Nguyễn Văn Minh (Hội Trưởng Thiện Nguyện)',
        biography:
          'Chuyên gia xây dựng dự án cộng đồng và phát triển tri thức vùng cao với hơn 10 năm kinh nghiệm thiện nguyện.',
        walletAddress: '0x90F79bf6eb2c4f870365E785982E1f101E93b906', // Địa chỉ ví test mặc định
        status: 'ACTIVE',
      },
    })
    console.log(`✔ Đã tạo người dùng test mới: ${user.name}`)
  } else {
    // Đảm bảo user test ở trạng thái ACTIVE để được phép tạo/quản lý dự án
    user = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
    })
    console.log(`✔ Sử dụng người dùng hiện có làm Founder: ${user.name} (Ví: ${user.walletAddress})`)
  }

  // 3. Tạo tài khoản 4 Nhà quyên góp (Donors/Investors) mẫu có ảnh đại diện đẹp
  const donorDatas = [
    {
      email: 'son.tran@gmail.com',
      name: 'Trần Thanh Sơn',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      biography: 'Nhà hảo tâm, yêu thích đóng góp cho các hoạt động giáo dục vùng cao.',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      status: 'ACTIVE' as const,
    },
    {
      email: 'anh.le@gmail.com',
      name: 'Lê Mai Anh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      biography: 'Tình nguyện viên xanh, mong muốn phủ xanh đồi trọc Việt Nam.',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Địa chỉ ví thử nghiệm khác
      status: 'ACTIVE' as const,
    },
    {
      email: 'duc.pham@gmail.com',
      name: 'Phạm Minh Đức',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      biography: 'Nhà tài trợ doanh nghiệp vừa và nhỏ, đam mê các giải pháp bền vững.',
      walletAddress: '0x15d34AAf54a67C6810E79776db01F529D7D76B13',
      status: 'ACTIVE' as const,
    },
    {
      email: 'chi.hoang@gmail.com',
      name: 'Hoàng Thùy Chi',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      biography: 'Người ủng hộ các sáng kiến vì cộng đồng, bảo vệ thú cưng và môi trường.',
      walletAddress: '0x25062b19A1c90c6deeA4cedf8C5D075F38E25301',
      status: 'ACTIVE' as const,
    },
  ]

  const donors = []
  for (const d of donorDatas) {
    let existingDonor = await prisma.user.findUnique({ where: { walletAddress: d.walletAddress } })
    if (!existingDonor) {
      existingDonor = await prisma.user.create({ data: d })
    } else {
      existingDonor = await prisma.user.update({
        where: { id: existingDonor.id },
        data: { name: d.name, avatar: d.avatar, biography: d.biography, status: 'ACTIVE' },
      })
    }
    donors.push(existingDonor)
  }
  console.log(`✔ Đã khởi tạo ${donors.length} tài khoản nhà quyên góp mẫu có avatar.`)

  // 4. Lấy hoặc tạo Admin
  let admin = await prisma.admin.findFirst()
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        email: 'admin@fundhive.org',
        password: 'hashedpassword_test_123',
        name: 'Ban Điều Hành FundHive',
        isActive: true,
      },
    })
    console.log(`✔ Đã tạo tài khoản Admin mới: ${admin.name}`)
  }

  // 5. Lấy hoặc tạo Categories
  const categories = await prisma.category.findMany()
  if (categories.length === 0) {
    const catDatas = [
      { name: 'Giáo dục & Tri thức', slug: 'education-knowledge' },
      { name: 'Y tế & Sức khỏe', slug: 'healthcare-wellbeing' },
      { name: 'Môi trường & Trồng rừng', slug: 'environment-green' },
      { name: 'Cứu trợ cộng đồng', slug: 'community-relief' },
    ]
    for (const cat of catDatas) {
      const c = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          createdBy: admin.id,
        },
      })
      categories.push(c)
    }
    console.log('✔ Đã khởi tạo 4 danh mục dự án phi lợi nhuận.')
  }

  const categoryIds = categories.map((c) => c.id)

  // 6. Cấu hình 10 dự án phi lợi nhuận thực tế
  const now = new Date()
  const oneDay = 24 * 60 * 60 * 1000

  const projectSeeds = [
    {
      title: 'Tủ Sách Tri Thức Vùng Cao Mù Cang Chải',
      subtitle:
        'Quyên góp tủ sách, bàn học và thiết bị dạy học cho trẻ em nghèo dân tộc thiểu số tại 5 điểm trường khó khăn ở Yên Bái.',
      images: [
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Mù Cang Chải, Yên Bái',
      description:
        'Dự án nhằm mục đích trang bị 10 tủ sách với hơn 5,000 đầu sách giáo khoa, sách tham khảo, truyện tranh giáo dục và dụng cụ học tập thiết yếu cho học sinh vùng cao khó tiếp cận nguồn học liệu chất lượng.',
      risks: 'Thời tiết mưa lũ cản trở vận chuyển đường núi; địa hình hiểm trở khó lắp ráp bàn ghế.',
      totalAmount: 5000,
      raisedAmount: 0,
      status: ProjectStatus.PROGRESS,
      startDate: new Date(now.getTime() - 5 * oneDay),
      endDate: new Date(now.getTime() + 25 * oneDay),
      categoryId: categoryIds[0],
      milestones: [
        {
          order: 1,
          title: 'Khảo sát và chọn lọc đầu sách',
          description: 'Gặp gỡ trực tiếp nhà trường, lên danh mục đầu sách phù hợp lứa tuổi và thu mua thiết bị.',
          amount: 1500,
          durationDays: 10,
          advantages: 'Nhà trường phối hợp nhiệt tình cung cấp danh sách cần thiết.',
          challenges: 'Thu mua sách gốc số lượng lớn giá ưu đãi cần thời gian thương lượng.',
          outcome: 'Danh sách 5,000 cuốn sách được phân loại xong kèm hóa đơn đặt hàng.',
        },
        {
          order: 2,
          title: 'Vận chuyển và thiết lập không gian đọc',
          description: 'Vận chuyển kệ sách, bàn ghế từ Hà Nội lên Yên Bái, lắp ráp hoàn chỉnh tại các phòng đọc.',
          amount: 2500,
          durationDays: 15,
          advantages: 'Đội ngũ tình nguyện viên bản địa sẵn sàng hỗ trợ ngày công.',
          challenges: 'Đường đèo núi sạt lở mùa mưa có thể làm chậm lịch giao nhận.',
          outcome: '5 phòng đọc tại 5 điểm trường hoàn thiện giá sách và trang trí sạch sẽ.',
        },
        {
          order: 3,
          title: 'Nghiệm thu bàn giao và tập huấn vận hành',
          description: 'Bàn giao chìa khóa phòng đọc cho đại diện nhà trường, hướng dẫn thủ thư quản lý mượn trả.',
          amount: 1000,
          durationDays: 5,
          advantages: 'Phần mềm quản lý sách đơn giản dễ sử dụng.',
          challenges: 'Thầy cô kiêm nhiệm thủ thư bận rộn công tác giảng dạy chuyên môn.',
          outcome: 'Biên bản nghiệm thu ký kết kèm video học sinh sử dụng thư viện ngày khai trương.',
        },
      ],
    },
    {
      title: 'Phủ Xanh Đồi Trọc Quảng Trị',
      subtitle:
        'Trồng 15,000 cây xanh phòng hộ ven rừng nhằm chống xói mòn đất và bảo vệ nguồn nước ngầm cho người dân miền Trung.',
      images: [
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Hướng Hóa, Quảng Trị',
      description:
        'Gây quỹ hạt giống và cây keo giống, lim xanh để giao cho các hộ dân nghèo miền núi tự chăm sóc và bảo vệ rừng đầu nguồn, vừa tạo thu nhập vừa tăng độ che phủ rừng xanh.',
      risks: 'Nắng nóng hạn hán kéo dài làm giảm tỷ lệ sống của cây non.',
      totalAmount: 8000,
      raisedAmount: 8000,
      status: ProjectStatus.ACTIVE,
      startDate: new Date(now.getTime() - 15 * oneDay),
      endDate: new Date(now.getTime() - 2 * oneDay),
      categoryId: categoryIds[2],
      milestones: [
        {
          order: 1,
          title: 'Chuẩn bị đất trồng và cây giống',
          description: 'Ủ hạt giống, chuẩn bị bầu ươm và phân phát cây non cho các hộ dân tham gia chăm sóc rừng.',
          amount: 3000,
          durationDays: 10,
          advantages: 'Cây giống bản địa khỏe mạnh, thích nghi tốt thời tiết khắc nghiệt.',
          challenges: 'Nắng nóng kéo dài khiến đất cằn cỗi cần bón lót kỹ lưỡng.',
          outcome: '15,000 cây giống đạt chuẩn chiều cao được vận chuyển đến điểm tập kết.',
        },
        {
          order: 2,
          title: 'Đợt ra quân xuống giống hàng loạt',
          description: 'Huy động đoàn viên và người dân đào hố trồng cây phủ kín diện tích đồi trọc khảo sát.',
          amount: 3500,
          durationDays: 15,
          advantages: 'Nhận được sự ủng hộ tuyệt đối của Ủy ban nhân dân xã.',
          challenges: 'Địa hình đồi dốc cao, việc chuyển nước tưới ban đầu rất khó khăn.',
          outcome: 'Toàn bộ 15,000 cây được trồng xuống đất đúng quy chuẩn khoảng cách.',
        },
        {
          order: 3,
          title: 'Kiểm đếm tỷ lệ sống và chăm sóc định kỳ',
          description: 'Kiểm tra độ bám rễ, dọn cỏ dại quanh gốc cây non và dặm lại những cây bị héo úa.',
          amount: 1500,
          durationDays: 20,
          advantages: 'Người dân tuần tra rừng hàng ngày đảm bảo gia súc không phá hoại.',
          challenges: 'Sâu bệnh phá rễ cây keo non xuất hiện rải rác.',
          outcome: 'Biên bản đo đạc tỷ lệ sống đạt trên 92% có xác nhận kiểm lâm địa phương.',
        },
      ],
    },
    {
      title: 'Nước Sạch Học Đường Hà Giang',
      subtitle:
        'Lắp đặt 10 hệ thống lọc nước RO công nghiệp tại các điểm trường mầm non và tiểu học khó khăn huyện Yên Minh.',
      images: [
        'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Yên Minh, Hà Giang',
      description:
        'Nguồn nước tự nhiên ở đây bị nhiễm đá vôi nặng, gây ảnh hưởng nghiêm trọng đến sức khỏe tiêu hóa của trẻ em. Dự án sẽ xây dựng bể chứa và lắp đặt máy lọc nước uống trực tiếp.',
      risks: 'Nguồn điện tại điểm trường không ổn định dễ làm cháy màng lọc RO.',
      totalAmount: 6000,
      raisedAmount: 0,
      status: ProjectStatus.PENDING, // Chờ duyệt
      startDate: new Date(now.getTime() + 5 * oneDay),
      endDate: new Date(now.getTime() + 35 * oneDay),
      categoryId: categoryIds[1],
      milestones: [
        {
          order: 1,
          title: 'Kiểm tra chất lượng nguồn nước và mua thiết bị',
          description: 'Lấy mẫu nước đi xét nghiệm chỉ số hóa lý và đặt mua máy lọc nước công suất lớn.',
          amount: 2000,
          durationDays: 7,
          advantages: 'Trung tâm y tế huyện hỗ trợ kiểm nghiệm mẫu nước miễn phí.',
          challenges: 'Hệ thống điện áp yếu cần bổ sung ổn áp đi kèm cho từng máy lọc.',
          outcome: 'Báo cáo chỉ số nước đầu vào và bộ 10 máy lọc kèm bộ ổn áp về kho.',
        },
        {
          order: 2,
          title: 'Thi công xây bể chứa trung chuyển và lắp đặt máy',
          description: 'Xây dựng chân đế bê tông, kết nối đường ống từ khe núi vào bể chứa rồi lắp hệ thống lọc.',
          amount: 3000,
          durationDays: 12,
          advantages: 'Thợ địa phương có tay nghề hỗ trợ thi công chi phí thấp.',
          challenges: 'Độ cao chênh lệch lớn khiến áp lực nước đường ống không đều.',
          outcome: 'Nước lọc đầu ra đạt tiêu chuẩn uống trực tiếp của Bộ Y Tế.',
        },
        {
          order: 3,
          title: 'Bàn giao công trình và hướng dẫn bảo trì',
          description: 'Bàn giao van điều khiển, cấp lõi lọc dự phòng cho trường tự thay thế định kỳ.',
          amount: 1000,
          durationDays: 5,
          advantages: 'Cơ chế tự ngắt khi đầy nước giúp bảo vệ thiết bị bền lâu.',
          challenges: 'Học sinh tiểu học hiếu động cần rào chắn bảo vệ khu kỹ thuật lọc.',
          outcome: 'Học sinh có nước lọc tinh khiết sử dụng hàng ngày.',
        },
      ],
    },
    {
      title: 'Bữa Cơm Ấm Lòng Bệnh Nhân Nghèo',
      subtitle:
        'Cung cấp 12,000 suất ăn dinh dưỡng miễn phí cho bệnh nhân ung thư có hoàn cảnh đặc biệt tại Bệnh viện K Tân Triều.',
      images: [
        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Thanh Trì, Hà Nội',
      description:
        'Nhằm giảm bớt gánh nặng chi phí sinh hoạt cho các gia đình khó khăn đang điều trị dài ngày tại bệnh viện. Mọi bữa ăn đều được chuẩn bị sạch sẽ, đầy đủ dinh dưỡng.',
      risks: 'Biến động giá cả thực phẩm thị trường tăng cao đột xuất.',
      totalAmount: 4000,
      raisedAmount: 0,
      status: ProjectStatus.APPROVED, // Đã duyệt, chờ đẩy lên chuỗi
      startDate: new Date(now.getTime() + 1 * oneDay),
      endDate: new Date(now.getTime() + 20 * oneDay),
      categoryId: categoryIds[3],
      milestones: [
        {
          order: 1,
          title: 'Hợp đồng nguồn thực phẩm an toàn',
          description: 'Ký kết hợp đồng cung cấp thực phẩm từ hợp tác xã rau sạch và trang trại chăn nuôi uy tín.',
          amount: 1000,
          durationDays: 5,
          advantages: 'Nhận được mức giá chiết khấu hỗ trợ từ nhà cung cấp thiện nguyện.',
          challenges: 'Đảm bảo chứng nhận vệ sinh an toàn thực phẩm khắt khe.',
          outcome: 'Danh sách nhà cung cấp đạt chuẩn và giấy cam kết chất lượng.',
        },
        {
          order: 2,
          title: 'Chế biến và trao tặng đợt 1',
          description: 'Nấu ăn tại bếp công nghiệp đạt chuẩn và trao tận tay 6,000 suất ăn tại bệnh viện K.',
          amount: 2000,
          durationDays: 15,
          advantages: 'Đội ngũ đầu bếp có chứng chỉ dinh dưỡng trực tiếp giám sát.',
          challenges: 'Điều phối hàng dài bệnh nhân nhận cơm trật tự phòng dịch.',
          outcome: 'Nhật ký hình ảnh và danh sách 6,000 bệnh nhân nhận phiếu cơm.',
        },
        {
          order: 3,
          title: 'Hoàn thành trao tặng đợt 2',
          description: 'Thực hiện nấu và phát nốt 6,000 suất ăn còn lại cùng báo cáo tài chính mua sắm thực phẩm.',
          amount: 1000,
          durationDays: 15,
          advantages: 'Được các bác sĩ phòng công tác xã hội hỗ trợ phân phát phiếu nhận cơm.',
          challenges: 'Sức khỏe nhiều bệnh nhân yếu cần chế biến cháo dinh dưỡng thay cơm.',
          outcome: 'Hoàn tất chiến dịch trao tặng cơm kèm bảng sao kê tài chính rõ ràng.',
        },
      ],
    },
    {
      title: 'Mái Ấm Tình Thương Cứu Hộ Động Vật Cô Đơn',
      subtitle:
        'Gây quỹ xây dựng khu chuồng nuôi ấm áp và cung cấp thức ăn, y tế cho hơn 150 chó mèo hoang bị bỏ rơi tại Hà Nội.',
      images: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Sóc Sơn, Hà Nội',
      description:
        'Trạm cứu hộ gặp khó khăn về tài chính, không đủ mái che mùa đông và chi phí tiêm chủng phòng dại cho các bé chó mèo lang thang được đón về trạm.',
      risks: 'Chi phí thuốc men, điều trị y tế cho chó mèo bị bệnh nặng phát sinh vượt tầm kiểm soát.',
      totalAmount: 3000,
      raisedAmount: 3000,
      status: ProjectStatus.SUCCESS, // Dự án thành công hoàn toàn
      startDate: new Date(now.getTime() - 60 * oneDay),
      endDate: new Date(now.getTime() - 40 * oneDay),
      categoryId: categoryIds[3],
      milestones: [
        {
          order: 1,
          title: 'Cải tạo mái che khu trú ẩn',
          description: 'Lợp lại mái tôn chống nóng chống mưa dột và lót đệm rơm ấm cho chó mèo.',
          amount: 1200,
          durationDays: 10,
          advantages: 'Đất trạm rộng rãi nằm xa khu dân cư nên không ồn ào.',
          challenges: 'Thời tiết chuyển rét buốt cần bổ sung đèn sưởi công suất lớn.',
          outcome: 'Khu chuồng trại lợp mái tôn lót sàn gỗ và đệm rơm khô ráo ấm áp.',
        },
        {
          order: 2,
          title: 'Cung cấp thức ăn và tiêm chủng',
          description: 'Đặt mua 1.5 tấn thức ăn hạt khô và thuê bác sĩ thú y tới tiêm ngừa dại, triệt sản chó mèo.',
          amount: 1300,
          durationDays: 15,
          advantages: 'Phòng khám thú y đồng ý hỗ trợ triệt sản giá phi lợi nhuận.',
          challenges: 'Một số bé chó mèo hoang nhút nhát và hung dữ khi tiếp cận tiêm thuốc.',
          outcome: '100% thú y được chích vaccine ngừa bệnh truyền nhiễm.',
        },
        {
          order: 3,
          title: 'Chiến dịch kết nối nhận nuôi',
          description: 'Chụp hình các bé đưa lên trang thông tin tìm chủ mới có trách nhiệm.',
          amount: 500,
          durationDays: 10,
          advantages: 'Cộng đồng yêu thú cưng lan tỏa thông tin rất mạnh mẽ.',
          challenges: 'Quy trình xét duyệt chủ nuôi kỹ càng để tránh các bé bị bỏ rơi lần hai.',
          outcome: '25 bé chó mèo đã tìm được gia đình mới yêu thương tốt bụng.',
        },
      ],
    },
    {
      title: 'Lớp Học Ánh Sáng Cho Trẻ Em Đường Phố',
      subtitle:
        'Tài trợ chi phí giáo viên và sách vở cho lớp học tình thương buổi tối dành cho trẻ bán vé số, đánh giày khu vực Quận 4.',
      images: [
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Quận 4, TP. Hồ Chí Minh',
      description:
        'Lớp học hoạt động liên tục nhằm xóa mù chữ và dạy kỹ năng tự vệ cho trẻ lang thang cơ nhỡ, giúp các em có cơ hội thay đổi tương lai.',
      risks: 'Các em phải đi làm kiếm sống không thể duy trì đi học đều đặn.',
      totalAmount: 4500,
      raisedAmount: 0,
      status: ProjectStatus.PROGRESS,
      startDate: new Date(now.getTime() - 2 * oneDay),
      endDate: new Date(now.getTime() + 28 * oneDay),
      categoryId: categoryIds[0],
      milestones: [
        {
          order: 1,
          title: 'Thuê phòng học và trang bị bảng đen',
          description: 'Đặt cọc thuê phòng học sạch sẽ thoáng mát gần khu chợ và lắp đặt bảng viết, đèn chiếu sáng.',
          amount: 1500,
          durationDays: 7,
          advantages: 'Chủ nhà giảm giá thuê 30% khi biết lớp học thiện nguyện.',
          challenges: 'Tìm kiếm không gian ít ồn ào trong lòng khu phố lao động.',
          outcome: 'Lớp học có đầy đủ ánh sáng, bảng viết và 15 bộ bàn ghế xếp gọn.',
        },
        {
          order: 2,
          title: 'Cung cấp tài liệu học và phần ăn phụ',
          description: 'In ấn giáo trình toán tiếng Việt cơ bản và phát sữa, bánh ngọt cho các em trước giờ học.',
          amount: 2000,
          durationDays: 20,
          advantages: 'Các em hào hứng đi học vì có bánh sữa bồi dưỡng năng lượng.',
          challenges: 'Trình độ nhận thức của các em lệch nhau nhiều cần chia nhóm kèm cặp riêng.',
          outcome: '40 bộ tài liệu hoàn chỉnh được phát kèm 1,200 phần sữa bánh dinh dưỡng.',
        },
        {
          order: 3,
          title: 'Tổng kết kiểm tra trình độ và liên hoan',
          description: 'Tổ chức bài kiểm tra năng lực cuối khóa để trao học bổng khuyến học cho em tiến bộ.',
          amount: 1000,
          durationDays: 10,
          advantages: 'Đội ngũ sinh viên tình nguyện nhiệt tình làm gia sư trợ giảng.',
          challenges: 'Nhiều em tự ti không dám lên bảng làm bài kiểm tra.',
          outcome: '95% học sinh biết đọc viết những âm vần chữ cái cơ bản nhất.',
        },
      ],
    },
    {
      title: 'Bảo Tồn Bản Sắc Văn Hóa Nhạc Cụ Tây Nguyên',
      subtitle: 'Mở lớp truyền dạy cồng chiêng và đàn T’rưng cho thế hệ trẻ của đồng bào Bana tại buôn làng Đắk Lắk.',
      images: [
        'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Buôn Ma Thuột, Đắk Lắk',
      description:
        'Dự án mời các nghệ nhân lão thành về dạy cách chế tác và diễn tấu cồng chiêng cho thanh thiếu niên trong buôn, tránh nguy cơ mai một di sản phi vật thể quốc gia.',
      risks: 'Nghệ nhân cao tuổi sức khỏe yếu có thể gián đoạn lịch lên lớp.',
      totalAmount: 7000,
      raisedAmount: 0,
      status: ProjectStatus.PROGRESS,
      startDate: new Date(now.getTime() - 1 * oneDay),
      endDate: new Date(now.getTime() + 45 * oneDay),
      categoryId: categoryIds[0],
      milestones: [
        {
          order: 1,
          title: 'Tìm kiếm và chế tác nhạc cụ',
          description: 'Liên hệ mua đồng đúc chiêng cổ và các thanh tre già đạt chuẩn âm thanh làm đàn T’rưng.',
          amount: 2500,
          durationDays: 15,
          advantages: 'Nghệ nhân am hiểu kỹ thuật chọn lọc vật liệu rất tinh tường.',
          challenges: 'Nguyên liệu tre nứa già đạt chuẩn khan hiếm mùa mưa.',
          outcome: 'Một bộ cồng chiêng đúc mới đạt chuẩn âm thanh buôn làng cùng 3 cây đàn T’rưng gỗ.',
        },
        {
          order: 2,
          title: 'Khóa học thực hành âm nhạc 2 tháng',
          description: 'Hỗ trợ xăng xe, thù lao nghệ nhân dạy nhạc 3 buổi/tuần cho 30 thanh niên trong làng.',
          amount: 3500,
          durationDays: 30,
          advantages: 'Giới trẻ hào hứng kết nối nét đẹp văn hóa truyền thống.',
          challenges: 'Diễn tấu chiêng đôi đòi hỏi sự đồng điệu nhịp điệu tập luyện lâu ngày.',
          outcome: 'Các em biết gõ những bài nhạc truyền thống cúng lúa mới, lễ hội đâm trâu.',
        },
        {
          order: 3,
          title: 'Lễ hội trình diễn báo cáo cộng đồng',
          description: 'Tổ chức đêm nhạc đốt lửa trại trình diễn văn nghệ cồng chiêng trước toàn thể dân làng.',
          amount: 1000,
          durationDays: 5,
          advantages: 'Địa phương hỗ trợ công tác dựng trại truyền thống tại nhà rông.',
          challenges: 'Chuẩn bị trang phục thổ cẩm truyền thống đồng bộ cho đội diễn viên.',
          outcome: 'Đêm diễn rộn rã cồng chiêng gắn kết tình buôn làng khăng khít.',
        },
      ],
    },
    {
      title: 'Đông Ấm Mèo Vạc - Áo Phao Che Gió Ngàn',
      subtitle: 'Quyên góp áo phao đại hàn dày dặn chống thấm gió cho học sinh mầm non tại xã biên giới Lũng Pú.',
      images: [
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1608228079906-4a34b2236190?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Mèo Vạc, Hà Giang',
      description:
        'Mùa đông Hà Giang rét cắt da cắt thịt, sương muối phủ trắng đèo. Nhiều em nhỏ chỉ mặc áo mỏng rách đi bộ tới trường. Dự án cung cấp áo phao bông giữ nhiệt.',
      risks: 'Chiến dịch không đạt tiến độ quyên góp kịp trước khi đợt lạnh đỉnh điểm tràn về.',
      totalAmount: 3500,
      raisedAmount: 1200,
      status: ProjectStatus.FAILED, // Dự án quá hạn gọi vốn
      startDate: new Date(now.getTime() - 40 * oneDay),
      endDate: new Date(now.getTime() - 10 * oneDay),
      categoryId: categoryIds[3],
      milestones: [
        {
          order: 1,
          title: 'Thiết kế mẫu áo và khảo sát size',
          description: 'Lấy số đo chiều cao cân nặng của các em và liên hệ xưởng may đo theo form áo gió chống lạnh.',
          amount: 1000,
          durationDays: 7,
          advantages: 'Ủy ban xã gửi danh sách số đo đầy đủ nhanh chóng.',
          challenges: 'Dịch bệnh tại vùng biên khiến nguyên liệu vải bông dệt tăng giá nhẹ.',
          outcome: 'Mẫu áo phao bông cam ấm có logo được thống nhất kích thước.',
        },
        {
          order: 2,
          title: 'Sản xuất và nghiệm thu tại xưởng',
          description: 'Tiến hành cắt may hàng loạt và kiểm tra đường kim mũi chỉ trước khi đóng gói bao bì.',
          amount: 2000,
          durationDays: 15,
          advantages: 'Xưởng may ưu tiên đẩy nhanh tiến độ dây chuyền thiện nguyện.',
          challenges: 'Thiếu nhân công đóng gói số lượng lớn.',
          outcome: '1,000 chiếc áo phao ấm xếp ngay ngắn trong kiện thùng các-tông.',
        },
        {
          order: 3,
          title: 'Phát tặng và kiểm đếm tận tay',
          description: 'Tổ chức xe chở quần áo lên Hà Giang phát trực tiếp tại các điểm trường.',
          amount: 500,
          durationDays: 5,
          advantages: 'Các thầy cô giáo hỗ trợ nhận diện từng học sinh khó khăn.',
          challenges: 'Địa hình nhiều đá dốc trơn trượt mùa sương mù cản trở xe tải vận chuyển.',
          outcome: 'Nụ cười ấm áp của các em nhỏ khi đón đông biên cương.',
        },
      ],
    },
    {
      title: 'Ứng Dụng Hướng Dẫn Sơ Cứu Ban Đầu Tiếng Việt',
      subtitle:
        'Xây dựng ứng dụng di động phi lợi nhuận hướng dẫn xử lý nhanh các sự cố y tế thường gặp: đuối nước, hóc dị vật, gãy xương.',
      images: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Quận 1, TP. Hồ Chí Minh',
      description:
        'Sơ cứu không đúng cách chiếm hơn 40% nguyên nhân tử vong thương tâm trước khi đến viện. Ứng dụng cung cấp bài học bằng video động họa dễ nhớ, chạy không cần internet.',
      risks: 'Kiểm duyệt nội dung y khoa không chuẩn xác gây hiểu lầm tai hại.',
      totalAmount: 9000,
      raisedAmount: 0,
      status: ProjectStatus.APPROVED, // Đã duyệt, chờ đẩy lên chuỗi
      startDate: new Date(now.getTime() + 3 * oneDay),
      endDate: new Date(now.getTime() + 40 * oneDay),
      categoryId: categoryIds[0],
      milestones: [
        {
          order: 1,
          title: 'Soạn thảo nội dung và cố vấn y khoa',
          description:
            'Làm việc cùng các bác sĩ cấp cứu bệnh viện Chợ Rẫy để biên soạn cẩm nang quy trình sơ cứu y khoa chuẩn.',
          amount: 2000,
          durationDays: 10,
          advantages: 'Hội Chữ Thập Đỏ cử chuyên gia tư vấn giáo trình chuẩn quốc tế.',
          challenges: 'Chuyển ngữ các thuật ngữ y học phức tạp thành câu lệnh cực kỳ ngắn gọn.',
          outcome: 'Kịch bản 15 tình huống sơ cứu nguy cấp đã duyệt nội dung y tế.',
        },
        {
          order: 2,
          title: 'Thiết kế giao diện và dựng video động họa',
          description:
            'Thiết kế giao diện phẳng trực quan dễ tìm kiếm và vẽ hình minh họa chuyển động 2D mô tả thao tác ép tim ngoài lồng ngực.',
          amount: 5000,
          durationDays: 20,
          advantages: 'Đội ngũ thiết kế trẻ hỗ trợ cống hiến chất xám chi phí thấp.',
          challenges: 'Dựng hoạt họa cử động tay ép ngực chuẩn xác nhịp tim cần chỉnh sửa nhiều lần.',
          outcome: '15 video hoạt họa hướng dẫn sơ cứu hoàn thiện kèm file thiết kế UI/UX.',
        },
        {
          order: 3,
          title: 'Lập trình ứng dụng Android/iOS',
          description:
            'Viết code lập trình chạy ngoại tuyến không quảng cáo, đưa ứng dụng lên Google Play và App Store.',
          amount: 2000,
          durationDays: 15,
          advantages: 'Hệ thống chạy mượt mà trên cả các thiết bị đời cũ cấu hình yếu.',
          challenges: 'Quy trình kiểm duyệt app của Apple khắt khe về nội dung y tế sức khỏe.',
          outcome: 'Đường link tải app chính thức hoàn toàn miễn phí không quảng cáo trên cả 2 kho ứng dụng.',
        },
      ],
    },
    {
      title: 'Học Đường Không Rác Thải Nhựa',
      subtitle:
        'Xây dựng mô hình thu gom và hướng dẫn tái chế chai nhựa thành đồ chơi, chậu cây tại 10 trường THCS ở ngoại ô Hà Nội.',
      images: [
        'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
      ],
      location: 'Đông Anh, Hà Nội',
      description:
        'Dự án tổ chức ngày hội đổi rác lấy quà và tặng cho mỗi trường học một góc tái chế sáng tạo chứa máy nghiền nhựa mini tạo hạt nhựa mới.',
      risks: 'Học sinh thiếu duy trì thói quen sau khi kết thúc chuỗi ngày hội.',
      totalAmount: 5500,
      raisedAmount: 0,
      status: ProjectStatus.PENDING, // Chờ duyệt
      startDate: new Date(now.getTime() + 10 * oneDay),
      endDate: new Date(now.getTime() + 30 * oneDay),
      categoryId: categoryIds[2],
      milestones: [
        {
          order: 1,
          title: 'Thiết kế góc phân loại rác sáng tạo',
          description:
            'Đóng thùng gỗ ép chứa 3 ngăn đựng rác phân loại và in bảng hướng dẫn ngộ nghĩnh cho học sinh dễ hiểu.',
          amount: 1500,
          durationDays: 5,
          advantages: 'BGH nhà trường hoan nghênh và bố trí vị trí đặt thùng rác thuận lợi.',
          challenges: 'Tìm chất liệu sơn bền màu khó trầy xước dưới thời tiết sân trường.',
          outcome: '30 thùng phân loại rác ba ngăn được giao đến các điểm trường.',
        },
        {
          order: 2,
          title: 'Ngày hội Đổi rác lấy quà',
          description: 'Huy động học sinh gom chai nhựa đổi lấy sen đá, sách vở và đồ dùng học tập tái chế.',
          amount: 2500,
          durationDays: 10,
          advantages: 'Các bậc phụ huynh tích cực thu gom rác từ gia đình cùng con mang đến.',
          challenges: 'Số lượng rác nhựa khổng lồ đổ về cần kho bãi tập kết tạm thời trước khi nghiền.',
          outcome: 'Thu gom hơn 3 tấn nhựa sạch phân loại và tặng hơn 1,000 chậu sen đá.',
        },
        {
          order: 3,
          title: 'Lắp đặt máy nghiền và trao thưởng mô hình xanh',
          description: 'Lắp ráp mô hình máy cắt nhựa nhỏ an toàn cho các em tự chế tác và trao danh hiệu dũng sĩ xanh.',
          amount: 1500,
          durationDays: 10,
          advantages: 'Trường cử giáo viên kỹ thuật cùng phối hợp vận hành máy nghiền nhựa.',
          challenges: 'Đảm bảo tiêu chuẩn an toàn điện áp chống giật cho máy móc.',
          outcome: 'Góc học tập xanh đi vào hoạt động ổn định và tự vận hành lâu dài.',
        },
      ],
    },
  ]

  // 6. Ghi dữ liệu vào MongoDB Atlas qua Prisma
  const createdProjectsMap: Record<string, string> = {}

  for (const seed of projectSeeds) {
    const slug = makeSlug(seed.title)
    const { categoryId, milestones, ...projectData } = seed

    // Khởi tạo Project kết hợp Milestone và ProjectCategory lồng nhau
    const createdProject = await prisma.project.create({
      data: {
        ...projectData,
        slug,
        userId: user.id,
        projectCategories: {
          create: [
            {
              categoryId,
            },
          ],
        },
        milestones: {
          create: milestones.map((m) => ({
            order: m.order,
            title: m.title,
            description: m.description,
            slug: makeSlug(m.title),
            amount: m.amount,
            startDate: new Date(now.getTime() + (m.order - 1) * 15 * oneDay),
            endDate: new Date(now.getTime() + m.order * 15 * oneDay),
            advantages: m.advantages,
            challenges: m.challenges,
            outcome: m.outcome,
            // Nếu dự án đã SUCCESS, thì đặt trạng thái các Milestone là WITHDRAWN để trùng khớp on-chain
            status: seed.status === ProjectStatus.SUCCESS ? MilestoneStatus.WITHDRAWN : MilestoneStatus.COMING_SOON,
          })),
        },
      },
    })

    createdProjectsMap[seed.title] = createdProject.id
    console.log(`✔ Đã nạp thành công dự án: "${createdProject.title}" [Trạng thái: ${createdProject.status}]`)
  }

  // 7. Tạo các lượt đóng góp (Investments) tương ứng
  console.log('=== TIẾN HÀNH SEED DỮ LIỆU ĐÓNG GÓP (INVESTMENTS) ===')
  const investmentSeeds = [
    // 1. Tủ Sách Tri Thức Vùng Cao Mù Cang Chải
    {
      projectTitle: 'Tủ Sách Tri Thức Vùng Cao Mù Cang Chải',
      donorIdx: 0, // Trần Thanh Sơn
      amount: 1000,
      content: 'Chúc dự án sớm hoàn thiện để các con có sách đọc nhé!',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Tủ Sách Tri Thức Vùng Cao Mù Cang Chải',
      donorIdx: 1, // Lê Mai Anh
      amount: 500,
      content: 'Ủng hộ hết mình hoạt động khuyến học vùng cao ý nghĩa.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Tủ Sách Tri Thức Vùng Cao Mù Cang Chải',
      donorIdx: 2, // Phạm Minh Đức
      amount: 500,
      content: 'Đóng góp nhỏ bé hy vọng tiếp thêm động lực cho team.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Tủ Sách Tri Thức Vùng Cao Mù Cang Chải',
      donorIdx: 3, // Hoàng Thùy Chi
      amount: 300,
      content: 'Mong dự án sớm đạt mốc gọi vốn 5000 USDT!',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },

    // 2. Phủ Xanh Đồi Trọc Quảng Trị
    {
      projectTitle: 'Phủ Xanh Đồi Trọc Quảng Trị',
      donorIdx: 0, // Trần Thanh Sơn
      amount: 4000,
      content: 'Trồng rừng phòng hộ là việc tối quan trọng. Chúc dự án thành công!',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Phủ Xanh Đồi Trọc Quảng Trị',
      donorIdx: 1, // Lê Mai Anh
      amount: 3000,
      content: 'Ước mong nhìn thấy đồi trọc Hướng Hóa phủ kín Lim xanh.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Phủ Xanh Đồi Trọc Quảng Trị',
      donorIdx: 2, // Phạm Minh Đức
      amount: 1000,
      content: 'Vì một tương lai Việt Nam xanh tươi vững bền.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },

    // 6. Lớp Học Ánh Sáng Cho Trẻ Em Đường Phố
    {
      projectTitle: 'Lớp Học Ánh Sáng Cho Trẻ Em Đường Phố',
      donorIdx: 1, // Lê Mai Anh
      amount: 800,
      content: 'Mong các em ngoan ngoãn học chữ để tự bảo vệ mình nhé.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Lớp Học Ánh Sáng Cho Trẻ Em Đường Phố',
      donorIdx: 3, // Hoàng Thùy Chi
      amount: 1000,
      content: 'Yêu thương và đồng hành cùng các em học sinh hiếu học.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },

    // 7. Bảo Tồn Bản Sắc Văn Hóa Nhạc Cụ Tây Nguyên
    {
      projectTitle: 'Bảo Tồn Bản Sắc Văn Hóa Nhạc Cụ Tây Nguyên',
      donorIdx: 0, // Trần Thanh Sơn
      amount: 2000,
      content: 'Cần bảo tồn tiếng cồng chiêng cho muôn đời sau.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Bảo Tồn Bản Sắc Văn Hóa Nhạc Cụ Tây Nguyên',
      donorIdx: 2, // Phạm Minh Đức
      amount: 1500,
      content: 'Đóng góp ủng hộ phát triển văn hóa buôn làng.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },

    // 8. Đông Ấm Mèo Vạc - Áo Phao Che Gió Ngàn
    {
      projectTitle: 'Đông Ấm Mèo Vạc - Áo Phao Che Gió Ngàn',
      donorIdx: 1, // Lê Mai Anh
      amount: 700,
      content: 'Ấm lòng mùa đông biên cương cho các bé.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
    {
      projectTitle: 'Đông Ấm Mèo Vạc - Áo Phao Che Gió Ngàn',
      donorIdx: 2, // Phạm Minh Đức
      amount: 500,
      content: 'Ủng hộ Lũng Pú.',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
  ]

  const projectRaisedSums: Record<string, number> = {}

  for (const inv of investmentSeeds) {
    const projectId = createdProjectsMap[inv.projectTitle]
    if (!projectId) continue

    const donor = donors[inv.donorIdx]

    await prisma.investment.create({
      data: {
        projectId,
        userId: donor.id,
        amount: inv.amount,
        content: inv.content,
        txHash: inv.txHash,
        status: 'SUCCESS', // Giao dịch quyên góp thành công
      },
    })

    projectRaisedSums[projectId] = (projectRaisedSums[projectId] || 0) + inv.amount
  }

  // Cập nhật lại số tiền đã gọi được (raisedAmount) cho các dự án tương ứng
  for (const [projectId, raisedSum] of Object.entries(projectRaisedSums)) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        raisedAmount: raisedSum,
      },
    })
    console.log(`✔ Đã cập nhật số tiền gọi được của dự án [ID: ${projectId}] là ${raisedSum} USDT`)
  }

  console.log('=== SEED DỮ LIỆU DỰ ÁN & ĐÓNG GÓP THÀNH CÔNG RỰC RỠ! ===')
}

main()
  .catch((e) => {
    console.error('Lỗi nghiêm trọng khi chạy script seed:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
