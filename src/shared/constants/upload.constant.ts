import path from 'path'

export const UPLOAD_DIR = path.resolve('upload')
export const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB cho ảnh
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB cho video
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

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
