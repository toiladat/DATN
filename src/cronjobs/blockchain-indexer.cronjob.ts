import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ethers } from 'ethers'
import { PrismaService } from '../shared/services/prisma.service'
import { ProjectRepository } from '../routes/project/project.repo'
import { INVESTMENT_STATUS } from '../shared/constants/project.constant'

@Injectable()
export class BlockchainIndexerCronjob {
  private readonly logger = new Logger(BlockchainIndexerCronjob.name)
  private provider: ethers.JsonRpcProvider
  private iface: ethers.Interface
  private contractAddress: string
  private isProcessing = false // Chống Race Condition

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectRepo: ProjectRepository,
  ) {
    // Khởi tạo RPC Provider
    const rpcUrl = process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com'
    this.provider = new ethers.JsonRpcProvider(rpcUrl)

    // Khởi tạo Contract Address & ABI
    this.contractAddress = process.env.CROWDFUNDING_ADDRESS || '0x6ba7c843ff71A771249c1f8BE00fC4Bc51D75b94'
    this.iface = new ethers.Interface([
      'event Contributed(uint256 indexed id, address indexed contributor, uint256 amount)',
      'event ProjectCreated(uint256 indexed projectId, address indexed creator, uint256 goal)',
    ])
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkPendingInvestments() {
    if (this.isProcessing) {
      this.logger.warn('Previous cron job is still running. Skipping this tick.')
      return
    }

    this.isProcessing = true

    try {
      // 1. Cleanup Stale PENDING records (Dọn rác)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      await this.prisma.investment.updateMany({
        where: {
          status: INVESTMENT_STATUS.PENDING,
          createdAt: { lt: oneHourAgo },
        },
        data: { status: INVESTMENT_STATUS.FAILED },
      })

      // 2. Lấy các giao dịch PENDING cần đối soát
      const pendingInvestments = await this.prisma.investment.findMany({
        where: {
          status: INVESTMENT_STATUS.PENDING,
          txHash: { not: null },
        },
      })

      const pendingProjects = await this.prisma.project.findMany({
        where: {
          status: 'APPROVED',
          launchTxHash: { not: null },
        },
      })

      if (pendingInvestments.length === 0 && pendingProjects.length === 0) return

      this.logger.log(
        `Found ${pendingInvestments.length} PENDING investment(s) and ${pendingProjects.length} PENDING project(s). Checking...`,
      )

      const currentBlock = await this.provider.getBlockNumber()

      for (const investment of pendingInvestments) {
        if (!investment.txHash) continue

        try {
          const receipt = await this.provider.getTransactionReceipt(investment.txHash)

          if (!receipt) {
            // Chưa có receipt -> chờ tiếp
            continue
          }

          // 3. Block Confirmations Check (Chống Re-orgs)
          if (currentBlock - receipt.blockNumber < 5) {
            this.logger.log(`TxHash ${investment.txHash} has < 5 confirmations. Waiting...`)
            continue
          }

          // 4. Giải mã Event Logs (Decode & Verify)
          if (receipt.status === 1) {
            let isValid = false

            for (const log of receipt.logs) {
              // Kiểm tra xem log có phải phát ra từ Smart Contract của mình không?
              if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) continue

              try {
                // Bóc tách dữ liệu Event
                const parsedLog = this.iface.parseLog({ topics: log.topics as string[], data: log.data })

                if (parsedLog && parsedLog.name === 'Contributed') {
                  const eventProjectId = parsedLog.args.id // Đây là BigInt (uint256)
                  const eventAmount = parsedLog.args.amount // Đây là BigInt (uint256)

                  // Bước Xác minh A: ID Dự án
                  // Chuyển BigInt thành chuỗi Hex chuẩn 24 ký tự của MongoDB
                  const hexId = eventProjectId.toString(16).padStart(24, '0')
                  if (hexId !== investment.projectId) {
                    this.logger.warn(`ProjectId mismatch: Blockchain(${hexId}) vs DB(${investment.projectId})`)
                    continue
                  }

                  // Bước Xác minh B: Số tiền
                  // Ép kiểu số lượng Database (amount) sang quy chuẩn wei (18 decimals) để so sánh với Blockchain
                  const expectedAmount = ethers.parseEther(investment.amount.toString())
                  if (eventAmount >= expectedAmount) {
                    isValid = true
                    break
                  } else {
                    this.logger.warn(`Amount mismatch: Blockchain(${eventAmount}) vs DB(${expectedAmount})`)
                  }
                }
              } catch (e) {
                this.logger.error(`Error parsing log: ${e.message}`)
                // Log không khớp ABI, bỏ qua
              }
            }

            if (isValid) {
              await this.projectRepo.updateInvestmentStatus(investment.txHash, 'SUCCESS')
              this.logger.log(`TxHash ${investment.txHash} VERIFIED & SUCCESS`)
            } else {
              // Bắt quả tang gian lận -> FAILED
              await this.projectRepo.updateInvestmentStatus(investment.txHash, 'FAILED')
              this.logger.warn(`TxHash ${investment.txHash} FAILED VALIDATION (Fake Tx/Tampered)`)
            }
          } else if (receipt.status === 0) {
            // Giao dịch trên Blockchain bị Reverted
            await this.projectRepo.updateInvestmentStatus(investment.txHash, 'FAILED')
            this.logger.log(`TxHash ${investment.txHash} REVERTED -> Set FAILED`)
          }
        } catch (error) {
          this.logger.error(`Error checking txHash ${investment.txHash}: ${error.message}`)
        }
      }

      // 4. Kiểm tra các project vừa Launch
      for (const project of pendingProjects) {
        if (!project.launchTxHash) continue

        try {
          const receipt = await this.provider.getTransactionReceipt(project.launchTxHash)
          if (!receipt) continue

          if (receipt.status === 1) {
            // Success -> parse event ProjectCreated
            for (const log of receipt.logs) {
              try {
                const parsedLog = this.iface.parseLog({ topics: [...log.topics], data: log.data })
                if (parsedLog && parsedLog.name === 'ProjectCreated') {
                  const projectIdHex = parsedLog.args[0].toString(16)
                  // check if projectId matches (note: parsedLog.args[0] is uint256, hex of mongodb id is 24 chars)
                  if (projectIdHex === project.id || '0x' + projectIdHex === '0x' + project.id) {
                    await this.prisma.project.update({
                      where: { id: project.id },
                      data: { status: 'PROGRESS' },
                    })
                    this.logger.log(`Project ${project.id} is now PROGRESS!`)
                  }
                }
              } catch (e) {
                this.logger.error(`Error parsing log: ${e.message}`)
                // ignore parsing error for other events
              }
            }
          } else if (receipt.status === 0) {
            // Failed -> Revert status back or handle?
            // For now, we can clear the launchTxHash so they can retry
            await this.prisma.project.update({
              where: { id: project.id },
              data: { launchTxHash: null },
            })
            this.logger.log(`Project ${project.id} launch REVERTED -> Cleared txHash`)
          }
        } catch (error) {
          this.logger.error(`Error checking project txHash ${project.launchTxHash}: ${error.message}`)
        }
      }
    } catch (error) {
      this.logger.error(`Error in cron job checkPendingInvestments: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }
}
