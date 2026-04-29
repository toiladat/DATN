import { z } from 'zod'

export const EmptyBodySchema = z.object({})

export type EmptyBodyType = z.infer<typeof EmptyBodySchema>

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
})

export type PaginationQueryType = z.infer<typeof PaginationQuerySchema>
