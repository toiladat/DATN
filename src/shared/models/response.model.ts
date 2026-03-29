import { z } from 'zod'
export const MessageResSchema = z.object({
  message: z.string(),
})

export const IdResSchema = z.object({
  id: z.string(),
})

export const GetBaseListResSchema = z.object({
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type MessageResType = z.infer<typeof MessageResSchema>
export type IdResType = z.infer<typeof IdResSchema>
export type GetBaseListResType = z.infer<typeof GetBaseListResSchema>
