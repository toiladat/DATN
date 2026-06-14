export const PROJECT_STATUS = {
  PENDING: 'PENDING', // chờ duyệt
  APPROVED: 'APPROVED', // đã được duyệt
  PROGRESS: 'PROGRESS', // đang gây quỹ
  EXPIRED: 'EXPIRED', // hết đến startDate và không đủ quỹ
  ACTIVE: 'ACTIVE', // đã  đủ quỹ và thực hiện milestones
  FAILED: 'FAILED', // thất bại
  SUCCESS: 'SUCCESS', // thành công
} as const

export const MILESTONE_STATUS = {
  COMING_SOON: 'COMING_SOON',
  PROGRESS: 'PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  APPROVED: 'APPROVED',
  WITHDRAWN: 'WITHDRAWN',
} as const

export const INVESTMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const

export const DEFAULT_CATEGORY_NAME = 'Uncategorized'

export const PROJECT_SORT = {
  TRENDING: 'trending',
  NEWEST: 'newest',
  MOST_FUNDED: 'most_funded',
} as const

export type ProjectSortType = (typeof PROJECT_SORT)[keyof typeof PROJECT_SORT]
