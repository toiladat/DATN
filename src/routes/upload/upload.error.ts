import { UnprocessableEntityException } from '@nestjs/common'
export const InvalidQuantityUploadException = new UnprocessableEntityException([
  {
    message: 'Error.Upload.InvalidQuantity',
    path: 'files',
  },
])

export const ProjectFilesLimitExceededException = new UnprocessableEntityException([
  {
    message: 'Error.Upload.ProjectLimitExceeded',
    path: 'files',
  },
])

// --- General Errors ---
export const InvalidUploadTypeException = new UnprocessableEntityException([
  {
    message: 'Error.Upload.InvalidType',
    path: 'type',
  },
])
