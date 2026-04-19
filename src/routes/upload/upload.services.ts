import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable } from '@nestjs/common'
import { unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import envConfig from 'src/shared/config'
import { ACCEPTED_UPLOAD_TYPES, MAX_FILE_QUANTITY } from 'src/shared/constants/upload.constant'
import { UploadFileServiceAbstract } from './upload.abstract-services'
import {
  InvalidQuantityUploadException,
  InvalidUploadTypeException,
  ProjectFilesLimitExceededException,
} from './upload.error'
import { BaseUploadInfoType, FileMetadataType, PresignedUploadFilesResType, UploadToBucketType } from './upload.model'

@Injectable()
export class UploadServices implements UploadFileServiceAbstract {
  private s3_client: S3Client

  constructor() {
    this.s3_client = new S3Client({
      region: 'auto',
      endpoint: `https://${envConfig.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: envConfig.R2_ACCESS_KEY_ID,
        secretAccessKey: envConfig.R2_SECRET_ACCESS_KEY,
      },
    })
  }

  async deleteFileFromPublicBucket(key: string) {
    await this.s3_client.send(
      new DeleteObjectCommand({
        Bucket: envConfig.R2_BUCKET,
        Key: key,
      }),
    )
  }

  // Get presigned URL
  async getPresignedUrls(
    files: { fileName: string; fileType: string }[],
    prefixPath: string,
  ): Promise<PresignedUploadFilesResType> {
    const result = []
    for (const file of files) {
      // SỬA 2: Sanitize tên file để tránh lỗi dấu cách/tiếng việt trên URL
      const cleanFileName = file.fileName.replace(/\s+/g, '-').replace(/[^\w.-]/g, '')
      const key = `${prefixPath}${Date.now()}-${cleanFileName}`

      const command = new PutObjectCommand({
        Bucket: envConfig.R2_BUCKET,
        Key: key,
        ContentType: file.fileType,
      })

      const uploadUrl = await getSignedUrl(this.s3_client, command, { expiresIn: 3600 })

      result.push({
        fileName: file.fileName,
        uploadUrl,
        fileUrl: `${envConfig.R2_PUBLIC_URL}/${key}`,
      })
    }
    return { data: result }
  }

  async uploadFileToBucket(data: UploadToBucketType) {
    try {
      const buffer = await sharp(data.filepath).webp({ quality: 75, effort: 4 }).toBuffer()

      const nameUUID = path.parse(data.filename).name
      const finalFileName = `${nameUUID}.webp`
      const key = `${data.pathInBucket}${finalFileName}`

      const parallelUploads3 = new Upload({
        client: this.s3_client,
        params: {
          Bucket: envConfig.R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/webp',
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      })

      await parallelUploads3.done()

      return {
        url: `${envConfig.R2_PUBLIC_URL}/${key}`,
        key,
      }
    } catch (error) {
      console.error('Upload Error:', error)
      throw error
    }
  }

  private getPrefixPath(userId: string, info: BaseUploadInfoType): string {
    const userBase = `users/${userId}`

    switch (info.type) {
      case ACCEPTED_UPLOAD_TYPES.COVER:
        return `${userBase}/cover/`

      case ACCEPTED_UPLOAD_TYPES.MILESTONE:
        return `${userBase}/milestones/`

      case ACCEPTED_UPLOAD_TYPES.PROJECT:
        return `${userBase}/projects/`

      default:
        throw InvalidUploadTypeException
    }
  }

  async uploadFiles(userId: string, info: BaseUploadInfoType, files: Array<Express.Multer.File>) {
    const uploadedKeys: string[] = []
    try {
      this.validateFileQuantity(info.type, files.length)

      const pathInBucket = this.getPrefixPath(userId, info)

      const uploadPromises = files.map(async (file) => {
        const res = await this.uploadFileToBucket({
          filename: file.filename,
          filepath: file.path,
          contentType: file.mimetype,
          pathInBucket,
        })

        uploadedKeys.push(res.key)

        return { url: res.url }
      })
      //check upload failed
      const results = await Promise.allSettled(uploadPromises)

      const failed = results.filter((res) => res.status === 'rejected')

      if (failed.length > 0) {
        const reason = failed[0].reason
        throw reason
      }

      const successfulUrls = results.map((res) => ({ url: (res as PromiseFulfilledResult<{ url: string }>).value.url }))
      return {
        data: successfulUrls,
      }
    } catch (error) {
      if (uploadedKeys.length > 0) {
        await Promise.allSettled(uploadedKeys.map((key) => this.deleteFileFromPublicBucket(key)))
      }
      throw error
    } finally {
      const results = await Promise.allSettled(files.map((file) => unlink(file.path)))
      results.forEach((res, index) => {
        if (res.status === 'rejected') {
          console.error(`Failed to delete temp file ${files[index].path}:`, res.reason)
        }
      })
    }
  }

  private validateFileQuantity(type: string, fileQuantity: number) {
    if (type === ACCEPTED_UPLOAD_TYPES.COVER) {
      if (fileQuantity !== MAX_FILE_QUANTITY.COVER) {
        throw InvalidQuantityUploadException
      }
    } else if (type === ACCEPTED_UPLOAD_TYPES.MILESTONE) {
      if (fileQuantity > MAX_FILE_QUANTITY.MILESTONE) {
        throw ProjectFilesLimitExceededException
      }
    } else if (type === ACCEPTED_UPLOAD_TYPES.PROJECT) {
      if (fileQuantity > MAX_FILE_QUANTITY.PROJECT) {
        throw ProjectFilesLimitExceededException
      }
    }
  }

  // Get presigned URL
  async getPresigned(userId: string, info: BaseUploadInfoType, files: FileMetadataType[]) {
    this.validateFileQuantity(info.type, files.length)

    const prefixPath = this.getPrefixPath(userId, info)

    const fileMetadata = files.map((file) => ({
      fileName: file.filename,
      fileType: file.filetype,
    }))
    return this.getPresignedUrls(fileMetadata, prefixPath)
  }
}
