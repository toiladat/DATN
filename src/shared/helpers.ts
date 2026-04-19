import { Prisma } from '@prisma/client'
import { randomInt } from 'crypto'
import path from 'path'
import slugify from 'slugify'
import { v7 } from 'uuid'

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

export const generateSlug = (title: string) => {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: 'vi',
    trim: true,
  })
}
