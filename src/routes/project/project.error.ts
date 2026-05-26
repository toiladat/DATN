import {
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'

export const ProjectNotFoundException = new NotFoundException('Error.ProjectNotFound')

export const UnauthorizedProjectAccessException = new ForbiddenException('Error.UnauthorizedProjectAccess')

export const InvalidProjectStatusException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidProjectStatus',
    path: 'status',
  },
])

export const MilestoneNotFoundException = new NotFoundException('Error.MilestoneNotFound')

export const MilestoneNotUnlockedException = new UnprocessableEntityException([
  {
    message: 'Error.MilestoneNotUnlocked',
    path: 'milestoneId',
  },
])

export const MilestoneAlreadyFinalizedException = new UnprocessableEntityException([
  {
    message: 'Error.MilestoneAlreadyFinalized',
    path: 'milestoneId',
  },
])

export const MilestoneNotApprovedException = new UnprocessableEntityException([
  {
    message: 'Error.MilestoneNotApproved',
    path: 'milestoneId',
  },
])

export const MilestoneAlreadyWithdrawnException = new UnprocessableEntityException([
  {
    message: 'Error.MilestoneAlreadyWithdrawn',
    path: 'milestoneId',
  },
])

export const DuplicateWithdrawalTxException = new UnprocessableEntityException([
  {
    message: 'Error.DuplicateWithdrawalTransaction',
    path: 'txHash',
  },
])

export const BlockchainCancelProjectException = new UnprocessableEntityException([
  {
    message: 'Error.BlockchainCancelProjectFailed',
    path: 'blockchain',
  },
])

// Refund-related exceptions
export const ProjectNotRefundableException = new BadRequestException('Project is not failed or expired. Cannot refund.')
export const NoInvestmentsToRefundException = new BadRequestException('No successful investments found to refund.')
export const BlockchainTxPendingOrFailedException = new BadRequestException(
  'Transaction is pending or failed on blockchain.',
)
export class BlockchainVerificationException extends BadRequestException {
  constructor(message: string) {
    super(`Failed to verify transaction on blockchain: ${message}`)
  }
}

// Review-related exceptions
export const ReviewNotFoundException = new NotFoundException('Review not found')
export const UnauthorizedReviewAccessException = new ForbiddenException('Unauthorized to modify this review')
