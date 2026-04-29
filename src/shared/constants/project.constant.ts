export const PROJECT_STATUS = {
  PENDING: 'PENDING',
  PROGRESS: 'PROGRESS',
  EXPIRED: 'EXPIRED',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
  SUCCESS: 'SUCCESS',
} as const

export const MILESTONE_STATUS = {
  COMING_SOON: 'COMMING_SOON',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  APPROVED: 'APPROVED',
  WITHDRAWN: 'WITHDRAWN',
} as const

export const INVESTMENT_STATUS = {
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
