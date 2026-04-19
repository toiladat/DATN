import path from 'path'

export const UPLOAD_DIR = path.resolve('upload')
export const MAX_FILE_SIZE = 15 * 1024 * 1024 // Nâng lên 5MB (1MB quá ít cho ảnh truyện HD)
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const ACCEPTED_UPLOAD_TYPES = {
  COVER: 'cover',
  MILESTONE: 'milestone',
  PROJECT: 'project',
} as const

export const MAX_FILE_QUANTITY = {
  COVER: 1,
  MILESTONE: 5,
  PROJECT: 5,
}
