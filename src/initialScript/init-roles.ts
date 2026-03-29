import envConfig from 'src/shared/config'
import { RoleName } from 'src/shared/constants/role.constant'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'

const prisma = new PrismaService()
const hashingService = new HashingService()

const main = async () => {
  await prisma.$connect()

  const roleCount = await prisma.role.count()
  if (roleCount > 0) {
    throw new Error('Roles already exist')
  }

  const roles = await prisma.role.createMany({
    data: [
      { name: RoleName.Admin, description: 'Admin role' },
      { name: RoleName.Client, description: 'Client role' },
      { name: RoleName.Seller, description: 'Seller role' },
    ],
  })

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { name: RoleName.Admin },
  })

  const adminUser = await prisma.user.create({
    data: {
      email: envConfig.ADMIN_EMAIL,
      password: await hashingService.hash(envConfig.ADMIN_PASSWORD),
      name: envConfig.ADMIN_NAME,
      phoneNumber: envConfig.ADMIN_PHONE,
      roleId: adminRole.id,
    },
  })

  return {
    createdRoleCount: roles.count,
    adminUser,
  }
}

main()
  .then(({ createdRoleCount, adminUser }) => {
    console.log('✅ createdRoleCount:', createdRoleCount)
    console.log('✅ adminUser:', adminUser)
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exitCode = 1
  })
