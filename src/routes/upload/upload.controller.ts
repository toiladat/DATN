import { Body, Controller, Post, Delete, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { MAX_FILE_QUANTITY } from 'src/shared/constants/upload.constant'
import { ActivateUser } from 'src/shared/decorators/activate-user.decorator'
import { FileUploadInterceptor } from 'src/shared/interceptor/file.interceptor'
import {
  PresignedUploadFilesBodyDTO,
  PresignedUploadFilesResDTO,
  UploadFilesBodyDTO,
  UploadFilesResDTO,
  DeleteFileBodyDTO,
} from './upload.dto'
import { UploadServices } from './upload.services'

@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadFileService: UploadServices) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type'], // Bắt buộc trường nào thì ghi vào đây
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        type: {
          type: 'string',
          enum: ['cover', 'milestone', 'project'],
          default: 'project',
        },
      },
    },
  })
  @ZodSerializerDto(UploadFilesResDTO)
  @UseInterceptors(FileUploadInterceptor('files', MAX_FILE_QUANTITY.MILESTONE))
  uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: UploadFilesBodyDTO,
    @ActivateUser('userId') userId: string,
  ) {
    return this.uploadFileService.uploadFiles(userId, body, files)
  }

  @Post('/presigned-url')
  @ZodSerializerDto(PresignedUploadFilesResDTO)
  @ApiResponse({ status: 200, type: PresignedUploadFilesResDTO })
  async createPresignedUrls(@Body() body: PresignedUploadFilesBodyDTO, @ActivateUser('userId') userId: string) {
    return await this.uploadFileService.getPresigned(userId, body.info, body.files)
  }

  @Delete()
  @ApiResponse({ status: 200 })
  async deleteFile(@Body() body: DeleteFileBodyDTO) {
    await this.uploadFileService.deleteByUrl(body.url)
    return { success: true }
  }
}
