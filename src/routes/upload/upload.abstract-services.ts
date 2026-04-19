import { PresignedUploadFilesResType, UploadToBucketType } from './upload.model'

export abstract class UploadFileServiceAbstract {
  abstract uploadFileToBucket(data: UploadToBucketType): Promise<{ url: string; key: string }>

  abstract deleteFileFromPublicBucket(key: string): Promise<void>

  abstract getPresignedUrls(
    files: { fileName: string; fileType: string }[],
    prefixPath: string,
  ): Promise<PresignedUploadFilesResType>
}
