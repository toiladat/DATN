import { ForbiddenException, UnprocessableEntityException, NotFoundException } from '@nestjs/common'

export const UserAlreadyExistsException = new UnprocessableEntityException([
  {
    message: 'Error.UserAlreadyExists',
    path: 'email',
  },
])

export const CannotUpdateAdminUserException = new ForbiddenException('Error.CannotUpdateAdminUser')

export const CannotDeleteAdminUserException = new ForbiddenException('Error.CannotDeleteAdminUser')

// Chỉ Admin mới có thể đặt role là ADMIN
export const CannotSetAdminRoleToUserException = new ForbiddenException('Error.CannotSetAdminRoleToUser')

export const RoleNotFoundException = new UnprocessableEntityException([
  {
    message: 'Error.RoleNotFound',
    path: 'roleId',
  },
])

// Không thể xóa hoặc cập nhật chính bản thân mình
export const CannotUpdateOrDeleteYourselfException = new ForbiddenException('Error.CannotUpdateOrDeleteYourself')

export const UserNotFoundException = new NotFoundException('Error.UserNotFound')
export const ProjectNotFoundForUserException = new NotFoundException('Project not found for this user')
