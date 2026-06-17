/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KHỞI ĐẦU DỌN DẸP DỮ LIỆU GỌI VỐN ===')

  try {
    // 1. Xóa các bản ghi liên quan đến Cột mốc & Rút tiền
    const withdrawal = await prisma.withdrawalRecord.deleteMany({})
    console.log(`- Đã xóa ${withdrawal.count} bản ghi WithdrawalRecord`)

    const update = await prisma.milestoneUpdate.deleteMany({})
    console.log(`- Đã xóa ${update.count} bản ghi MilestoneUpdate`)

    const milestone = await prisma.milestone.deleteMany({})
    console.log(`- Đã xóa ${milestone.count} bản ghi Milestone`)

    // 2. Xóa các bản ghi liên quan đến Đóng góp/Đầu tư
    const investment = await prisma.investment.deleteMany({})
    console.log(`- Đã xóa ${investment.count} bản ghi Investment`)

    // 3. Xóa các tương tác phụ (Like, Review, Thành viên)
    const like = await prisma.like.deleteMany({})
    console.log(`- Đã xóa ${like.count} bản ghi Like`)

    const review = await prisma.review.deleteMany({})
    console.log(`- Đã xóa ${review.count} bản ghi Review`)

    const member = await prisma.projectMember.deleteMany({})
    console.log(`- Đã xóa ${member.count} bản ghi ProjectMember`)

    const attachment = await prisma.projectAttachment.deleteMany({})
    console.log(`- Đã xóa ${attachment.count} bản ghi ProjectAttachment`)

    const projCat = await prisma.projectCategory.deleteMany({})
    console.log(`- Đã xóa ${projCat.count} bản ghi ProjectCategory`)

    // 4. Xóa chính Project
    const project = await prisma.project.deleteMany({})
    console.log(`- Đã xóa ${project.count} bản ghi Project`)

    console.log('=== DỌN DẸP THÀNH CÔNG! ===')
  } catch (error) {
    console.error('Lỗi khi dọn dẹp dữ liệu:', error)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
