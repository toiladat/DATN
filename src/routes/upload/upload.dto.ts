import { createZodDto } from 'nestjs-zod'
import {
  PresignedUploadFilesBodySchema,
  PresignedUploadFilesResSchema,
  UploadFilesBodySchema,
  UploadFilesResSchema,
  DeleteFileBodySchema,
} from 'src/routes/upload/upload.model'

export class PresignedUploadFilesBodyDTO extends createZodDto(PresignedUploadFilesBodySchema) {}
export class PresignedUploadFilesResDTO extends createZodDto(PresignedUploadFilesResSchema) {}

export class UploadFilesResDTO extends createZodDto(UploadFilesResSchema) {}
export class UploadFilesBodyDTO extends createZodDto(UploadFilesBodySchema) {}
export class DeleteFileBodyDTO extends createZodDto(DeleteFileBodySchema) {}
