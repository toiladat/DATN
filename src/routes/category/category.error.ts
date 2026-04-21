import { InternalServerErrorException } from '@nestjs/common'

export const FailedToFetchCategoriesException = new InternalServerErrorException('Error.FailedToFetchCategories')
