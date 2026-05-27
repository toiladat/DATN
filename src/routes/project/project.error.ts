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
export const ProjectNotRefundableException = new BadRequestException('Error.ProjectNotRefundable')
export const NoInvestmentsToRefundException = new BadRequestException('Error.NoInvestmentsToRefund')
export const BlockchainTxPendingOrFailedException = new BadRequestException('Error.BlockchainTxPendingOrFailed')
export class BlockchainVerificationException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Error.BlockchainVerificationFailed')
  }
}

// Review-related exceptions
export const ReviewNotFoundException = new NotFoundException('Error.ReviewNotFound')
export const UnauthorizedReviewAccessException = new ForbiddenException('Error.UnauthorizedReviewAccess')

export const UserKYCRequiredException = new ForbiddenException('Error.UserKYCRequired')
