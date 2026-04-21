import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_UPLOAD_TYPES,
  MAX_FILE_QUANTITY,
  MAX_VIDEO_SIZE,
} from 'src/shared/constants/upload.constant'
import { z } from 'zod'

const BaseUploadInfoSchema = z.object({
  type: z.enum([ACCEPTED_UPLOAD_TYPES.COVER, ACCEPTED_UPLOAD_TYPES.MILESTONE, ACCEPTED_UPLOAD_TYPES.PROJECT]),
})

const FileMetadataSchema = z
  .object({
    filename: z.string().min(1),
    filetype: z.string().refine((val) => ACCEPTED_IMAGE_TYPES.includes(val) || ACCEPTED_VIDEO_TYPES.includes(val), {
      message: 'File type must be an accepted image or video format',
    }),
    filesize: z.number().max(MAX_VIDEO_SIZE, 'File size must be less than max limit'),
  })
  .strict()

export const UploadFilesBodySchema = BaseUploadInfoSchema.strict()

export const PresignedUploadFilesBodySchema = z
  .object({
    info: BaseUploadInfoSchema,
    files: z.array(FileMetadataSchema).min(1, 'Must upload at least 1 file'),
  })
  .strict()
  .superRefine((data, ctx) => {
    const info = data.info
    const files = data.files

    if (info.type === ACCEPTED_UPLOAD_TYPES.COVER) {
      if (files.length !== MAX_FILE_QUANTITY.COVER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cover image must be exactly 1 file',
          path: ['files'],
        })
      }
    }

    if (info.type === ACCEPTED_UPLOAD_TYPES.MILESTONE) {
      if (files.length > MAX_FILE_QUANTITY.MILESTONE) {
        ctx.addIssue({
          code: 'custom',
          message: `Cannot upload more than ${MAX_FILE_QUANTITY.MILESTONE} images for a milestone`,
          path: ['files'],
        })
      }
    }

    if (info.type === ACCEPTED_UPLOAD_TYPES.PROJECT) {
      if (files.length > MAX_FILE_QUANTITY.PROJECT) {
        ctx.addIssue({
          code: 'custom',
          message: `Cannot upload more than ${MAX_FILE_QUANTITY.PROJECT} images for a project`,
          path: ['files'],
        })
      }
    }
  })

export const UploadFilesResSchema = z.object({
  data: z.array(z.object({ url: z.string() })),
})

export const PresignedUploadFilesResSchema = z.object({
  data: z.array(
    z.object({
      uploadUrl: z.string(),
      fileUrl: z.string(),
      fileName: z.string(),
    }),
  ),
})

export const UploadToBucketSchema = z.object({
  filename: z.string(),
  filepath: z.string(),
  contentType: z.string(),
  pathInBucket: z.string(),
})

export const DeleteFileBodySchema = z
  .object({
    url: z.string().url(),
  })
  .strict()

export type BaseUploadInfoType = z.infer<typeof BaseUploadInfoSchema>
export type FileMetadataType = z.infer<typeof FileMetadataSchema>

export type PresignedUploadFilesBodyType = z.infer<typeof PresignedUploadFilesBodySchema>
export type PresignedUploadFilesResType = z.infer<typeof PresignedUploadFilesResSchema>

export type UploadFilesBodyType = z.infer<typeof UploadFilesBodySchema>
export type UploadFilesResType = z.infer<typeof UploadFilesResSchema>

export type UploadToBucketType = z.infer<typeof UploadToBucketSchema>
