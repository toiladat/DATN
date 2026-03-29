import { BadRequestException } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { MAX_FILE_SIZE } from '../constants/upload.constant'

export function FileUploadInterceptor(fieldName: string = 'files', maxCount: number = 10) {
  return FilesInterceptor(fieldName, maxCount, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException(`File "${file.originalname}" must be (JPG, PNG, WEBP)!`), false)
      }

      // 2. Nếu cần chặn file fake (đuôi jpg nhưng nội dung exe),
      // check thêm magic number ở đây (nâng cao), nhưng mức cơ bản thì OK rồi.

      cb(null, true)
    },
  })
}
