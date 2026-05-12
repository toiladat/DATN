import { Body, Controller, Get, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ApiResponse } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { ProjectService } from './project.service'
import { PendingProjectsRestDTO, RejectProjectBodyDTO } from './project.dto'

@ApiTags('Admin Projects')
@Controller('admin/projects')
@ApiBearerAuth()
export class AdminProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('pending')
  @ApiResponse({ status: 200, type: PendingProjectsRestDTO })
  @ZodSerializerDto(PendingProjectsRestDTO)
  async getPendingProjects() {
    return this.projectService.getPendingProjects()
  }

  @Put(':id/approve')
  @ZodSerializerDto(MessageResDTO)
  @ApiResponse({ type: MessageResDTO })
  async approveProject(@Param('id') projectId: string) {
    return this.projectService.approveProject(projectId)
  }

  @Put(':id/reject')
  @ZodSerializerDto(MessageResDTO)
  @ApiResponse({ type: MessageResDTO })
  async rejectProject(@Param('id') projectId: string, @Body() body: RejectProjectBodyDTO) {
    return this.projectService.rejectProject(projectId, body.reason)
  }
}
