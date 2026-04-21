import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

export const CategoryResponseSchema = z.object({
  categories: z.array(CategorySchema),
})

export type CategoryType = z.infer<typeof CategorySchema>
export type CategoryResponseType = z.infer<typeof CategoryResponseSchema>
