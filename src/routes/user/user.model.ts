import { z } from 'zod'

export const GetUserParamsSchema = z
  .object({
    userId: z.string(),
  })
  .strict()

export type GetUserParamsType = z.infer<typeof GetUserParamsSchema>
