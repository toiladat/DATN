import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ZodError } from 'zod'

const CustomZodValidationPipe = createZodValidationPipe({
  createValidationException: (zodError: ZodError) => {
    const formatted = zodError.errors.map((issue) => ({
      ...issue,
      path: issue.path.join('.'),
    }))

    return new UnprocessableEntityException({
      statusCode: 422,
      message: 'Validation failed',
      errors: formatted,
    })
  },
})

export default CustomZodValidationPipe
