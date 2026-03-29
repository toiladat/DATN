import { Prisma } from '@prisma/client'
import { randomInt } from 'crypto'
import path from 'path'
import slugify from 'slugify'
import { v7 } from 'uuid'
import { ACCEPTED_UPLOAD_TYPES } from './constants/upload.constant'

//Kiểu trả về error is Prisma.PrismaClientKnownRequestError là type predicate để error được biết là kiểu Prisma
export const isUniqueConstraintPrismaError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export const isNotFoundPrismaError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export const generateOTP = (): string => {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

export const generateRandomFilename = (filename: string) => {
  const ext = path.extname(filename)
  return `${v7().toString()}${ext}`
}

// Định nghĩa Type chính xác cho từng loại
export type PathParams =
  | { type: `${typeof ACCEPTED_UPLOAD_TYPES.AVATAR}`; userId: string }
  | { type: `${typeof ACCEPTED_UPLOAD_TYPES.COVER}`; userId: string }
  | { type: `${typeof ACCEPTED_UPLOAD_TYPES.CHAPTER}`; userId: string; comicId: string }

export const generatePrefixPathInBucket = (params: PathParams): string => {
  const userBase = `users/${params.userId}`

  switch (params.type) {
    case ACCEPTED_UPLOAD_TYPES.AVATAR:
      return `${userBase}/avatar/`

    case ACCEPTED_UPLOAD_TYPES.COVER:
      return `${userBase}/cover/`

    case ACCEPTED_UPLOAD_TYPES.CHAPTER:
      return `${userBase}/comics/${params.comicId}/`

    default:
      throw new Error(`Invalid path type: ${JSON.stringify(params)}`)
  }
}

export const generateSlug = (title: string) => {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: 'vi',
    trim: true,
  })
}
