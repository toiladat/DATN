import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ethers } from 'ethers'
import { PrismaService } from '../shared/services/prisma.service'
import { ProjectRepository } from '../routes/project/project.repo'
import {
  INVESTMENT_STATUS,
  WITHDRAWAL_STATUS,
  PROJECT_STATUS,
  MILESTONE_STATUS,
} from '../shared/constants/project.constant'
import envConfig from 'src/shared/config'
import { RedisCacheService } from '../shared/services/redis-cache.service'

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
    private readonly redisCache: RedisCacheService,
  ) {
    // Khởi tạo RPC Provider
    const rpcUrl = envConfig.PROVIDER_URL
    this.provider = new ethers.JsonRpcProvider(rpcUrl)

    // Khởi tạo Contract Address & ABI
    this.contractAddress = envConfig.CROWDFUNDING_ADDRESS
    this.iface = new ethers.Interface([
      'event Contributed(uint256 indexed id, address indexed contributor, uint256 amount)',
      'event ProjectCreated(uint256 indexed projectId, address indexed creator, uint256 goal)',
      'event MilestoneWithdrawn(uint256 indexed projectId, uint256 milestoneIndex, uint256 amount)',
    ])
  }

  /** Bọc mọi RPC call với timeout để tránh hanging vô thời hạn */
  private withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`RPC call timed out after ${ms}ms`)), ms)),
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
          status: PROJECT_STATUS.APPROVED,
          launchTxHash: { not: null },
        },
      })

      const pendingWithdrawalCount = await this.prisma.withdrawalRecord.count({
        where: { status: WITHDRAWAL_STATUS.PENDING, txHash: { not: null } },
      })

      // Không có gì cần xử lý → thoát sớm
      if (pendingInvestments.length === 0 && pendingProjects.length === 0 && pendingWithdrawalCount === 0) return

      this.logger.log(
        `Found ${pendingInvestments.length} investment(s), ${pendingProjects.length} project(s), ${pendingWithdrawalCount} withdrawal(s). Checking...`,
      )

      const currentBlock = await this.withTimeout(this.provider.getBlockNumber())

      for (const investment of pendingInvestments) {
        if (!investment.txHash) continue

        try {
          const receipt = await this.withTimeout(this.provider.getTransactionReceipt(investment.txHash))

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

                  if (eventAmount > 0n && eventAmount <= expectedAmount) {
                    isValid = true
                    // Xử lý Capped Contribution: Nếu Smart Contract lấy ít hơn do dự án đã đủ Goal
                    if (eventAmount < expectedAmount) {
                      const actualAmount = Number(ethers.formatEther(eventAmount))
                      await this.prisma.investment.update({
                        where: { id: investment.id },
                        data: { amount: actualAmount },
                      })
                      this.logger.log(
                        `TxHash ${investment.txHash}: Contribution capped. Updated DB amount from ${investment.amount} to ${actualAmount}`,
                      )
                    }
                    break
                  } else if (eventAmount > expectedAmount) {
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
              await this.projectRepo.updateInvestmentStatus(investment.txHash, INVESTMENT_STATUS.SUCCESS)
              this.logger.log(`TxHash ${investment.txHash} VERIFIED & SUCCESS`)
            } else {
              // Bắt quả tang gian lận -> FAILED
              await this.projectRepo.updateInvestmentStatus(investment.txHash, INVESTMENT_STATUS.FAILED)
              this.logger.warn(`TxHash ${investment.txHash} FAILED VALIDATION (Fake Tx/Tampered)`)
            }
          } else if (receipt.status === 0) {
            // Giao dịch trên Blockchain bị Reverted
            await this.projectRepo.updateInvestmentStatus(investment.txHash, INVESTMENT_STATUS.FAILED)
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

          // Block Confirmations Check (Chống Re-orgs)
          if (currentBlock - receipt.blockNumber < 5) {
            this.logger.log(`Project Launch TxHash ${project.launchTxHash} has < 5 confirmations. Waiting...`)
            continue
          }

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
                      data: { status: PROJECT_STATUS.PROGRESS },
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

      // 5. Kiểm tra các Withdrawal đang PENDING
      await this.checkPendingWithdrawals(currentBlock)

      // 6. Quét các sự kiện tự phục hồi dữ liệu (Self-healing Event Scanner)
      await this.syncBlockchainEvents(currentBlock)
    } catch (error) {
      this.logger.error(`Error in cron job checkPendingInvestments: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  private async checkPendingWithdrawals(currentBlock: number) {
    const pendingWithdrawals = await this.prisma.withdrawalRecord.findMany({
      where: {
        status: WITHDRAWAL_STATUS.PENDING,
        txHash: { not: null },
      },
      include: {
        milestone: {
          select: { order: true, projectId: true },
        },
      },
    })

    if (pendingWithdrawals.length === 0) return

    this.logger.log(`Found ${pendingWithdrawals.length} PENDING withdrawal(s). Checking...`)

    for (const withdrawal of pendingWithdrawals) {
      if (!withdrawal.txHash) continue

      try {
        const receipt = await this.withTimeout(this.provider.getTransactionReceipt(withdrawal.txHash))

        if (!receipt) {
          // Chưa có receipt -> chờ tiếp
          continue
        }

        // Block Confirmations Check
        if (currentBlock - receipt.blockNumber < 5) {
          this.logger.log(`Withdrawal TxHash ${withdrawal.txHash} has < 5 confirmations. Waiting...`)
          continue
        }

        if (receipt.status === 1) {
          let isValid = false

          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) continue

            try {
              const parsedLog = this.iface.parseLog({ topics: log.topics as string[], data: log.data })

              if (parsedLog && parsedLog.name === 'MilestoneWithdrawn') {
                // Xác minh projectId
                const eventProjectId = parsedLog.args.projectId as bigint
                const hexId = eventProjectId.toString(16).padStart(24, '0')

                if (hexId !== withdrawal.milestone.projectId) {
                  this.logger.warn(
                    `Withdrawal ProjectId mismatch: Blockchain(${hexId}) vs DB(${withdrawal.milestone.projectId})`,
                  )
                  continue
                }

                // Xác minh milestoneIndex (contract dùng 0-index, DB dùng order 1-based)
                const eventMilestoneIndex = Number(parsedLog.args.milestoneIndex)
                const expectedIndex = withdrawal.milestone.order - 1

                if (eventMilestoneIndex !== expectedIndex) {
                  this.logger.warn(
                    `Withdrawal milestoneIndex mismatch: Blockchain(${eventMilestoneIndex}) vs DB(${expectedIndex})`,
                  )
                  continue
                }

                isValid = true
                break
              }
            } catch (e) {
              this.logger.error(`Error parsing log: ${e.message}`)
              // Log không khớp ABI, bỏ qua
            }
          }

          if (isValid) {
            await this.projectRepo.updateWithdrawalStatus(withdrawal.txHash, WITHDRAWAL_STATUS.SUCCESS)
            this.logger.log(`Withdrawal TxHash ${withdrawal.txHash} VERIFIED & SUCCESS -> Milestone WITHDRAWN`)
          } else {
            await this.projectRepo.updateWithdrawalStatus(withdrawal.txHash, WITHDRAWAL_STATUS.FAILED)
            this.logger.warn(`Withdrawal TxHash ${withdrawal.txHash} FAILED VALIDATION`)
          }
        } else if (receipt.status === 0) {
          await this.projectRepo.updateWithdrawalStatus(withdrawal.txHash, WITHDRAWAL_STATUS.FAILED)
          this.logger.log(`Withdrawal TxHash ${withdrawal.txHash} REVERTED -> Set FAILED`)
        }
      } catch (error) {
        this.logger.error(`Error checking withdrawal txHash ${withdrawal.txHash}: ${error.message}`)
      }
    }
  }

  private async syncBlockchainEvents(currentBlock: number) {
    try {
      const redisKey = 'blockchain_indexer:last_indexed_block'
      const lastIndexedBlock = await this.redisCache.get<number>(redisKey)

      // Nếu chưa quét bao giờ, mặc định bắt đầu từ currentBlock - 50 để tránh quét quá rộng
      let fromBlock = (lastIndexedBlock || currentBlock - 50) + 1
      if (fromBlock < 1) fromBlock = 1

      // Giới hạn dải quét tối đa 500 blocks mỗi tick để tránh treo RPC hoặc vượt giới hạn provider
      let toBlock = currentBlock
      if (toBlock - fromBlock > 500) {
        toBlock = fromBlock + 500
      }

      if (fromBlock > toBlock) return

      this.logger.log(`[EventScanner] Scanning events from block ${fromBlock} to ${toBlock}...`)

      const logs = await this.withTimeout(
        this.provider.getLogs({
          address: this.contractAddress,
          fromBlock: ethers.toBeHex(fromBlock),
          toBlock: ethers.toBeHex(toBlock),
        }),
        15000, // Tăng timeout cho hàm quét lịch sử logs
      )

      for (const log of logs) {
        try {
          const parsedLog = this.iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (!parsedLog) continue

          if (parsedLog.name === 'Contributed') {
            const eventProjectId = parsedLog.args.id // BigInt
            const eventContributor = parsedLog.args.contributor // string address
            const eventAmount = parsedLog.args.amount // BigInt (wei)

            // Chuyển BigInt thành chuỗi Hex chuẩn 24 ký tự của MongoDB
            const projectIdHex = eventProjectId.toString(16).padStart(24, '0')
            const amountEth = Number(ethers.formatEther(eventAmount))

            // 1. Kiểm tra xem investment này đã được ghi nhận chưa bằng transactionHash
            const existingInvestment = await this.prisma.investment.findUnique({
              where: { txHash: log.transactionHash },
            })

            if (!existingInvestment) {
              this.logger.log(
                `[EventScanner] Found unregistered Contributed event in tx ${log.transactionHash}. Recovering...`,
              )

              // Tìm User bằng walletAddress (không phân biệt hoa thường)
              const user = await this.prisma.user.findFirst({
                where: { walletAddress: { equals: eventContributor, mode: 'insensitive' } },
              })

              if (user) {
                // Tự động tạo bản ghi với trạng thái SUCCESS
                await this.prisma.investment.create({
                  data: {
                    projectId: projectIdHex,
                    userId: user.id,
                    amount: amountEth,
                    txHash: log.transactionHash,
                    status: INVESTMENT_STATUS.SUCCESS,
                    content: 'Auto-synchronized from Blockchain event',
                  },
                })

                // Cập nhật số tiền gây quỹ của Project
                const project = await this.prisma.project.update({
                  where: { id: projectIdHex },
                  data: {
                    raisedAmount: { increment: amountEth },
                  },
                  select: { raisedAmount: true, totalAmount: true },
                })

                // Đổi trạng thái sang ACTIVE nếu đã đủ vốn
                if (project.raisedAmount >= project.totalAmount - 0.000001) {
                  await this.prisma.project.update({
                    where: { id: projectIdHex },
                    data: { status: PROJECT_STATUS.ACTIVE },
                  })

                  // Approve Milestone 1
                  await this.prisma.milestone.updateMany({
                    where: { projectId: projectIdHex, order: 1 },
                    data: { status: MILESTONE_STATUS.APPROVED },
                  })
                }
                this.logger.log(
                  `[EventScanner] Successfully recovered missing investment: User(${user.id}), Project(${projectIdHex}), Amount(${amountEth})`,
                )
              } else {
                this.logger.warn(
                  `[EventScanner] Could not recover investment from tx ${log.transactionHash}: Contributor ${eventContributor} not found in DB.`,
                )
              }
            }
          } else if (parsedLog.name === 'MilestoneWithdrawn') {
            const eventProjectId = parsedLog.args.projectId as bigint
            const eventMilestoneIndex = Number(parsedLog.args.milestoneIndex) // 0-based
            const eventAmount = parsedLog.args.amount // BigInt (wei)

            const projectIdHex = eventProjectId.toString(16).padStart(24, '0')
            const dbMilestoneOrder = eventMilestoneIndex + 1

            // Kiểm tra xem withdrawalRecord này đã được ghi nhận chưa
            const existingWithdrawal = await this.prisma.withdrawalRecord.findUnique({
              where: { txHash: log.transactionHash },
            })

            if (!existingWithdrawal) {
              this.logger.log(
                `[EventScanner] Found unregistered MilestoneWithdrawn event in tx ${log.transactionHash}. Recovering...`,
              )

              // Tìm Milestone để lấy milestoneId
              const milestone = await this.prisma.milestone.findFirst({
                where: { projectId: projectIdHex, order: dbMilestoneOrder },
              })

              if (milestone) {
                // Tạo WithdrawalRecord mới ở trạng thái SUCCESS
                await this.prisma.withdrawalRecord.create({
                  data: {
                    milestoneId: milestone.id,
                    projectId: projectIdHex,
                    txHash: log.transactionHash,
                    amount: Number(ethers.formatEther(eventAmount)),
                    status: WITHDRAWAL_STATUS.SUCCESS,
                  },
                })

                // Cập nhật Milestone status = WITHDRAWN
                await this.prisma.milestone.update({
                  where: { id: milestone.id },
                  data: { status: MILESTONE_STATUS.WITHDRAWN },
                })

                // Kiểm tra hoàn thành dự án
                const totalMilestones = await this.prisma.milestone.count({
                  where: { projectId: projectIdHex },
                })

                const withdrawnMilestones = await this.prisma.milestone.count({
                  where: {
                    projectId: projectIdHex,
                    status: MILESTONE_STATUS.WITHDRAWN,
                  },
                })

                if (totalMilestones > 0 && withdrawnMilestones === totalMilestones) {
                  await this.prisma.project.update({
                    where: { id: projectIdHex },
                    data: { status: PROJECT_STATUS.SUCCESS },
                  })
                  this.logger.log(`[EventScanner] Project ${projectIdHex} completed all milestones -> Status SUCCESS`)
                }
                this.logger.log(
                  `[EventScanner] Successfully recovered missing withdrawal: Milestone(${milestone.id}), Project(${projectIdHex})`,
                )
              } else {
                this.logger.warn(
                  `[EventScanner] Could not recover withdrawal from tx ${log.transactionHash}: Milestone not found.`,
                )
              }
            }
          }
        } catch (err: any) {
          this.logger.error(`[EventScanner] Error processing log in tx ${log.transactionHash}: ${err.message}`)
        }
      }

      // Lưu lại block mới nhất đã quét thành công vào Redis
      await this.redisCache.set(redisKey, toBlock)
    } catch (error: any) {
      this.logger.error(`[EventScanner] Failed to scan blockchain events: ${error.message}`)
    }
  }
}
