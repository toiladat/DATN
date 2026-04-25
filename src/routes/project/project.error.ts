import { NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common'

export const ProjectNotFoundException = new NotFoundException('Error.ProjectNotFound')

export const UnauthorizedProjectAccessException = new ForbiddenException('Error.UnauthorizedProjectAccess')

export const InvalidProjectStatusException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidProjectStatus',
    path: 'status',
  },
])

export const MilestoneNotFoundException = new NotFoundException('Error.MilestoneNotFound')
