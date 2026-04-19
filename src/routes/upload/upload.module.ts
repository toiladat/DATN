import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { existsSync, mkdirSync } from 'fs'
import multer from 'multer'

import { UPLOAD_DIR } from 'src/shared/constants/upload.constant'
import { generateRandomFilename } from 'src/shared/helpers'
import { UploadController } from './upload.controller'
import { UploadServices } from './upload.services'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const newFilename = generateRandomFilename(file.originalname)
    cb(null, newFilename)
  },
})

@Module({
  providers: [UploadServices],
  imports: [
    MulterModule.register({
      storage,
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {
  constructor() {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true })
    }
  }
}
